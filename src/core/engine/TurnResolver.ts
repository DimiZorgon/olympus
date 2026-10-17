// src/core/engine/TurnResolver.ts
import {
  CardDefinition,
  GamePublicState,
  MajorGodId,
  ResourceType,
  TurnSubmission,
} from '../types/game.types';
import { CAPRICES_CATALOG, MAJOR_GODS_CATALOG } from '../data/cards.catalog';
import { areCoordsAdjacent, getPlayerConnectedFiefs } from '../map/HexMath';
import { calculateNetDrachmaCost, computePlayerResourcePool } from './CostCalculator';
import { computeEndOfRoundHarvest, computeFinalEndgameBonus } from './ScoreCalculator';

export interface PrivatePlayerHandRecord {
  player_id: string;
  is_bot: boolean;
  hand_card_ids: string[];
  reserve_card_ids: string[];
  pending_submission: TurnSubmission | null;
}

export function resolveSimultaneousTurn(
  game: GamePublicState,
  privateHands: Record<string, PrivatePlayerHandRecord>,
  allCardsMap: Record<string, CardDefinition>,
  deckForNextRounds: { round2: string[]; round3: string[] }
): {
  updatedGame: GamePublicState;
  updatedHands: Record<string, PrivatePlayerHandRecord>;
  turnEvents: string[];
} {
  const events: string[] = [];
  const tiles = structuredClone(game.board_tiles);
  const players = structuredClone(game.players_public);
  const majorGods = structuredClone(game.major_gods_state);
  const hands = structuredClone(privateHands);

  const playerIds = Object.keys(players);
  const capturedThisTurn: Record<string, Array<Exclude<ResourceType, 'ANY_BASE'>>> = {};
  playerIds.forEach((pid) => (capturedThisTurn[pid] = []));

  // Retirer les 2 cartes choisies de la main de chaque joueur
  for (const pid of playerIds) {
    const sub = hands[pid].pending_submission;
    if (!sub) continue;
    hands[pid].hand_card_ids = hands[pid].hand_card_ids.filter(
      (cid) => !sub.pickedFromHand.includes(cid)
    );
  }

  // ==========================================================================
  // ÉTAPE 1 : DÉFAUSSES (Max 1/tour = +3 Drachmes) & BONUS BLANCS
  // ==========================================================================
  for (const pid of playerIds) {
    const sub = hands[pid].pending_submission;
    if (!sub) continue;
    let discardCount = 0;

    for (const cmd of sub.commands) {
      if (cmd.actionType === 'DISCARD_FOR_DRACHMAS' && discardCount < 1) {
        discardCount++;
        const gain = game.active_caprice_id === 'CAP_02' ? 4 : 3;
        players[pid].drachmas += gain;
        events.push(`${players[pid].name} défausse une carte contre +${gain} Drachmes.`);
      } else if (cmd.actionType === 'PLAY_BONUS') {
        const card = allCardsMap[cmd.cardId];
        if (!card) continue;
        if (card.templateId === 'BON_CROESUS') {
          players[pid].drachmas += 6;
          events.push(`${players[pid].name} joue Trésor de Crésus (+6 Drachmes).`);
        } else if (card.templateId === 'BON_CHRONOS') {
          tiles
            .filter((t) => t.ownerId === pid)
            .forEach((t) => t.activeBrownBuffs.forEach((b) => (b.remainingTurns += 3)));
          events.push(`${players[pid].name} prolonge ses cartes Marron de +3 tours.`);
        } else if (card.templateId === 'BON_ORACLE') {
          players[pid].olympusFavor += 2;
          players[pid].drachmas += 3;
          events.push(`${players[pid].name} gagne +2 Faveur Divine et +3 Drachmes.`);
        }
      } else if (cmd.actionType === 'MOVE_TO_RESERVE') {
        if (!hands[pid].reserve_card_ids.includes(cmd.cardId)) {
          hands[pid].reserve_card_ids.push(cmd.cardId);
          events.push(`${players[pid].name} place une carte dans sa Zone de Chantier.`);
        }
      }
    }
  }

  // ==========================================================================
  // ÉTAPE 2 : POSE DES PIONS EMPLACEMENT / TERRAIN (Cartes Vertes)
  // ==========================================================================
  for (const pid of playerIds) {
    const sub = hands[pid].pending_submission;
    if (!sub) continue;

    for (const cmd of sub.commands) {
      if (cmd.actionType === 'CLAIM_TERRITORY') {
        const card = allCardsMap[cmd.cardId];
        const coord = card?.targetCoord || cmd.targetCoord;
        const tile = tiles.find((t) => t.coord === coord);
        if (tile && !tile.ownerId) {
          tile.ownerId = pid;
          if (tile.terrain === 'SEA') players[pid].drachmas += 1;
          events.push(`${players[pid].name} prend le contrôle de l'hexagone ${tile.coord}.`);
        }
      }
    }
  }

  // ==========================================================================
  // ÉTAPE 3 : MALUS ROUGES & CAPTURES (+1 Faveur Divine à la cible)
  // ==========================================================================
  if (game.active_caprice_id !== 'CAP_02') {
    for (const pid of playerIds) {
      const sub = hands[pid].pending_submission;
      if (!sub) continue;

      for (const cmd of sub.commands) {
        if (cmd.actionType !== 'PLAY_MALUS') continue;
        const card = allCardsMap[cmd.cardId];
        if (!card) continue;

        if (card.templateId === 'MAL_OLYMPUS_WRATH') {
          playerIds
            .filter((other) => other !== pid)
            .forEach((other) => {
              players[other].drachmas = Math.max(0, players[other].drachmas - 2);
            });
          events.push(`${players[pid].name} déclenche le Courroux de l'Olympe (-2 Dr. à tous).`);
          continue;
        }

        const targetPid =
          cmd.targetPlayerId ||
          tiles.find((t) => t.coord === cmd.targetCoord)?.ownerId ||
          playerIds.find((id) => id !== pid);

        if (!targetPid || targetPid === pid) continue;

        // Immunité Grand Temple d'Hadès sur la Cité ciblée
        const targetTile = cmd.targetCoord ? tiles.find((t) => t.coord === cmd.targetCoord) : null;
        const targetFiefs = getPlayerConnectedFiefs(tiles, targetPid);
        const targetedFief = targetTile ? targetFiefs.find((f) => f.some((t) => t.coord === targetTile.coord)) : null;
        const isCityProtectedByHades = targetedFief ? targetedFief.some((t) => t.building?.templateId === 'HADES') : false;

        if (isCityProtectedByHades) {
          events.push(
            `Le Grand Temple d'Hadès protège la Cité de ${players[targetPid].name} contre ${card.name}.`
          );
          continue;
        }

        // Protection Stratège Spartiate (max 1 malus par manche)
        if (
          players[targetPid].inhabitants.some((i) => i.startsWith('INH_05')) &&
          players[targetPid].malusesUsedOnMeThisRound >= 1
        ) {
          events.push(
            `Le Stratège Spartiate protège ${players[targetPid].name} contre ${card.name}.`
          );
          continue;
        }

        // Pitié des Dieux : +1 Faveur Divine immédiate à la cible !
        players[targetPid].olympusFavor += 1;
        players[targetPid].malusesUsedOnMeThisRound += 1;

        if (card.templateId === 'MAL_HERMES_PLUNDER') {
          const res = cmd.capturedResourceChoice || 'MARBLE';
          capturedThisTurn[pid].push(res);
          events.push(
            `${players[pid].name} capture 1 ${res} chez ${players[targetPid].name} (+1 Faveur à ${players[targetPid].name}).`
          );
        } else if (card.templateId === 'MAL_PIRATE_RAID' && players[pid].drachmas >= 2) {
          players[pid].drachmas -= 2;
          capturedThisTurn[pid].push(cmd.capturedResourceChoice || 'MARBLE');
          capturedThisTurn[pid].push(cmd.secondCapturedResourceChoice || 'WOOD');
          events.push(
            `${players[pid].name} lance un Raid Pirate sur ${players[targetPid].name} (+1 Faveur).`
          );
        } else if (card.templateId === 'MAL_CORINTH_TAX') {
          const stolen = Math.min(3, players[targetPid].drachmas);
          players[targetPid].drachmas -= stolen;
          players[pid].drachmas += stolen;
          events.push(
            `${players[pid].name} taxe ${stolen} Drachmes à ${players[targetPid].name} (+1 Faveur).`
          );
        } else if (card.templateId === 'MAL_TITAN_LANDSLIDE' && cmd.targetCoord) {
          const targetTile = tiles.find((t) => t.coord === cmd.targetCoord);
          if (targetTile && !targetTile.activeBrownBuffs.some((b) => b.isImmuneToMalus)) {
            targetTile.activeBrownBuffs.forEach((b) => (b.remainingTurns -= 2));
            targetTile.disabledNextTurn = true;
          }
        }
      }
    }
  }

  // ==========================================================================
  // ÉTAPE 4 : CONSTRUCTIONS (Bâtiments, Dieux Secondaires, Marron, Habitants)
  // ==========================================================================
  for (const pid of playerIds) {
    const sub = hands[pid].pending_submission;
    if (!sub) continue;

    for (const cmd of sub.commands) {
      if (cmd.actionType !== 'BUILD_ON_TILE' && cmd.actionType !== 'PLAY_INHABITANT') continue;
      const card = allCardsMap[cmd.cardId];
      if (!card) continue;

      const pool = computePlayerResourcePool(
        tiles,
        players[pid],
        capturedThisTurn[pid],
        game.active_caprice_id
      );
      const netDrachmas = calculateNetDrachmaCost(card.cost, pool, false, false);

      if (players[pid].drachmas < netDrachmas) continue;

      if (cmd.actionType === 'PLAY_INHABITANT' && card.category === 'INHABITANT') {
        players[pid].drachmas -= netDrachmas;
        players[pid].inhabitants.push(card.id);
        hands[pid].reserve_card_ids = hands[pid].reserve_card_ids.filter((id) => id !== card.id);
        if (card.templateId === 'INH_04') players[pid].olympusFavor += 2;
        events.push(`${players[pid].name} recrute ${card.name}.`);
      } else if (cmd.actionType === 'BUILD_ON_TILE' && cmd.targetCoord) {
        const tile = tiles.find((t) => t.coord === cmd.targetCoord && t.ownerId === pid);
        if (!tile) continue;

        if (card.category === 'SPECIAL_RESOURCE') {
          players[pid].drachmas -= netDrachmas;
          tile.activeBrownBuffs.push({
            cardId: card.id,
            templateId: card.templateId,
            name: card.name,
            remainingTurns: (card.durationTurns || 3) + 1, // +1 car décrémenté en fin de tour
            addedResource: card.producedResource,
            addedPower: card.power,
            isImmuneToMalus: card.templateId === 'BRN_NYMPHS',
            drachmasPerTurn: card.templateId === 'BRN_NYMPHS' ? 1 : 0,
          });
          hands[pid].reserve_card_ids = hands[pid].reserve_card_ids.filter((id) => id !== card.id);
          events.push(`${players[pid].name} place ${card.name} sur ${tile.coord}.`);
        } else if (
          (card.category === 'BUILDING' || card.category === 'SECONDARY_GOD') &&
          !tile.building
        ) {
          if (card.allowedTerrains && !card.allowedTerrains.includes(tile.terrain)) continue;
          if (tile.terrain === 'SANCTUARY' && card.category !== 'SECONDARY_GOD') continue;

          players[pid].drachmas -= netDrachmas;
          tile.building = {
            cardId: card.id,
            templateId: card.templateId,
            name: card.name,
            category: card.category,
            power: card.power,
          };
          hands[pid].reserve_card_ids = hands[pid].reserve_card_ids.filter((id) => id !== card.id);
          if (card.templateId === 'GOD_08') players[pid].olympusFavor += 2; // Aphrodite
          if (card.templateId === 'GOD_10') {
            // Héra : -5 Drachmes si aucun Grand Temple possédé
            const hasMajor = Object.values(majorGods).some((g) => g.ownerId === pid);
            if (!hasMajor) {
              players[pid].drachmas = Math.max(0, players[pid].drachmas - 5);
              events.push(`${players[pid].name} subit le malus d'Héra (-5 Drachmes car aucun Grand Temple).`);
            }
          }
          if (game.current_turn === 6 && game.active_caprice_id === 'CAP_03') {
            players[pid].totalScore += 2;
          }
          events.push(`${players[pid].name} bâtit ${card.name} sur ${tile.coord}.`);
        }
      }
    }
  }

  // ==========================================================================
  // ÉTAPE 5 : GRANDS TEMPLES (ZEUS, POSÉIDON, HADÈS) — Priorité Faveur Divine !
  // ==========================================================================
  const majorClaims: Array<{ pid: string; godId: MajorGodId; c1: string; c2: string }> = [];
  for (const pid of playerIds) {
    const sub = hands[pid].pending_submission;
    if (!sub) continue;
    for (const cmd of sub.commands) {
      if (
        cmd.actionType === 'CLAIM_MAJOR_GOD' &&
        cmd.targetCoord &&
        cmd.secondaryTargetCoord
      ) {
        majorClaims.push({
          pid,
          godId: cmd.cardId as MajorGodId,
          c1: cmd.targetCoord,
          c2: cmd.secondaryTargetCoord,
        });
      }
    }
  }

  // Tri par Faveur Divine décroissante, puis Drachmes décroissantes
  majorClaims.sort((a, b) => {
    if (players[b.pid].olympusFavor !== players[a.pid].olympusFavor) {
      return players[b.pid].olympusFavor - players[a.pid].olympusFavor;
    }
    return players[b.pid].drachmas - players[a.pid].drachmas;
  });

  for (const claim of majorClaims) {
    const godState = majorGods[claim.godId];
    const godDef = MAJOR_GODS_CATALOG[claim.godId];
    if (!godState?.available || !godDef) continue;

    const t1 = tiles.find((t) => t.coord === claim.c1 && t.ownerId === claim.pid && !t.building);
    const t2 = tiles.find((t) => t.coord === claim.c2 && t.ownerId === claim.pid && !t.building);
    if (!t1 || !t2 || !areCoordsAdjacent(tiles, t1.coord, t2.coord)) continue;

    const validTerrain =
      godDef.primaryTerrains.includes(t1.terrain) &&
      (godDef.secondaryTerrains.length === 0 || godDef.secondaryTerrains.includes(t2.terrain));
    if (!validTerrain) continue;

    const pool = computePlayerResourcePool(
      tiles,
      players[claim.pid],
      capturedThisTurn[claim.pid],
      game.active_caprice_id
    );
    const hasArchitect = players[claim.pid].inhabitants.some((i) => i.startsWith('INH_01'));
    const costDr = calculateNetDrachmaCost(godDef.cost, pool, true, hasArchitect);

    if (players[claim.pid].drachmas >= costDr) {
      players[claim.pid].drachmas -= costDr;
      godState.available = false;
      godState.ownerId = claim.pid;
      godState.coords = [t1.coord, t2.coord];

      t1.building = {
        cardId: claim.godId,
        templateId: claim.godId,
        name: godDef.name,
        category: 'MAJOR_GOD',
        power: godDef.power,
        linkedCoord: t2.coord,
      };
      t2.building = {
        cardId: claim.godId,
        templateId: claim.godId,
        name: `${godDef.name} (Aile)`,
        category: 'MAJOR_GOD',
        power: 0,
        linkedCoord: t1.coord,
        isSecondaryHalf: true,
      };
      if (claim.godId === 'ZEUS') players[claim.pid].olympusFavor += 2;
      events.push(
        `⚡ ${players[claim.pid].name} érige le ${godDef.name} sur ${t1.coord}-${t2.coord} !`
      );
    }
  }

  // ==========================================================================
  // ÉTAPE 6 : DÉCRÉMENTATION MARRON, PURGE CHANTIER (TOUR 6), RÉCOLTE & ROTATION
  // ==========================================================================
  for (const tile of tiles) {
    tile.activeBrownBuffs.forEach((b) => (b.remainingTurns -= 1));
    tile.activeBrownBuffs = tile.activeBrownBuffs.filter((b) => b.remainingTurns > 0);
  }

  let nextRound = game.current_round;
  let nextTurn = game.current_turn;
  let nextStatus = game.status;
  let nextCaprice = game.active_caprice_id;

  if (game.current_turn < 6) {
    nextTurn = (game.current_turn + 1) as 1 | 2 | 3 | 4 | 5 | 6;
    // Rotation des mains entre voisins (Horaire Manches 1 & 3, Anti-horaire Manche 2)
    const oldHands = playerIds.map((pid) => hands[pid].hand_card_ids);
    const n = playerIds.length;
    playerIds.forEach((pid, idx) => {
      const sourceIdx = game.current_round === 2 ? (idx + 1) % n : (idx - 1 + n) % n;
      hands[pid].hand_card_ids = oldHands[sourceIdx];
    });
  } else {
    // FIN DE MANCHE (Tour 6 terminé)
    // 1. Purge de la Zone de Chantier (5 Drachmes/carte ou 2 Dr. avec Contremaître, 2 gratuites par Entrepôt)
    for (const pid of playerIds) {
      const sub = hands[pid].pending_submission;
      const warehouses = tiles.filter(
        (t) => t.ownerId === pid && t.building?.templateId === 'BLD_WAREHOUSE'
      ).length;
      let freeSlots = warehouses * 2;
      const feePerCard = players[pid].inhabitants.some((i) => i.startsWith('INH_09')) ? 2 : 5;

      const keptIds: string[] = [];
      for (const resCardId of hands[pid].reserve_card_ids) {
        const decision = sub?.reserveCleanupDecisions?.find((d) => d.cardId === resCardId);
        if (game.active_caprice_id === 'CAP_03') {
          // Fièvre Architecturale : conservation en Chantier totalement interdite
          events.push(
            `${players[pid].name} détruit 1 carte de son Chantier (Fièvre Architecturale interdit la conservation).`
          );
        } else if (freeSlots > 0) {
          freeSlots--;
          keptIds.push(resCardId);
        } else if (
          decision?.decision === 'KEEP_PAY_DRACHMAS' &&
          players[pid].drachmas >= feePerCard
        ) {
          players[pid].drachmas -= feePerCard;
          keptIds.push(resCardId);
        } else {
          events.push(
            `${players[pid].name} détruit 1 carte non construite de son Chantier en fin de manche.`
          );
        }
      }
      hands[pid].reserve_card_ids = keptIds;
    }

    // 2. Phase de Récolte de Fin de Manche
    for (const pid of playerIds) {
      const harvest = computeEndOfRoundHarvest(tiles, players[pid], game.active_caprice_id);
      players[pid].scoreHistory.push(harvest.fiefPoints);
      players[pid].totalScore += harvest.fiefPoints;
      players[pid].drachmas += harvest.drachmasEarned;
      players[pid].malusesUsedOnMeThisRound = 0;
      events.push(
        `🌾 Récolte Manche ${game.current_round} — ${players[pid].name} : +${harvest.fiefPoints} PV et +${harvest.drachmasEarned} Drachmes.`
      );
    }

    // 3. Passage à la manche suivante ou Fin de Partie
    if (game.current_round < 3) {
      nextRound = (game.current_round + 1) as 1 | 2 | 3;
      nextTurn = 1;
      const roundPool = nextRound === 2 ? deckForNextRounds.round2 : deckForNextRounds.round3;
      playerIds.forEach((pid, idx) => {
        hands[pid].hand_card_ids = roundPool.slice(idx * 12, (idx + 1) * 12);
      });

      if (nextRound === 3 && game.enable_caprice_r3) {
        const randomCaprice =
          CAPRICES_CATALOG[Math.floor(Math.random() * CAPRICES_CATALOG.length)];
        nextCaprice = randomCaprice.id;
        events.push(`⚡ Caprice des Dieux Manche 3 : ${randomCaprice.name} !`);
      }
    } else {
      nextStatus = 'FINISHED';
      for (const pid of playerIds) {
        const endBonus = computeFinalEndgameBonus(tiles, players[pid], majorGods);
        players[pid].totalScore += endBonus;
        events.push(`🏆 Bonus Final — ${players[pid].name} : +${endBonus} PV (Score Final : ${players[pid].totalScore} PV).`);
      }
    }
  }

  // Réinitialisation des statuts READY
  for (const pid of playerIds) {
    hands[pid].pending_submission = null;
    players[pid].isReady = false;
    players[pid].reserveCount = hands[pid].reserve_card_ids.length;
  }

  return {
    updatedGame: {
      ...game,
      status: nextStatus,
      current_round: nextRound,
      current_turn: nextTurn,
      active_caprice_id: nextCaprice,
      major_gods_state: majorGods,
      board_tiles: tiles,
      players_public: players,
    },
    updatedHands: hands,
    turnEvents: events,
  };
}
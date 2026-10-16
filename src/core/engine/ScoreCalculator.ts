// src/core/engine/ScoreCalculator.ts
import {
  HexTile,
  MajorGodId,
  MajorGodState,
  PlayerPublicState,
  ResourceType,
} from '../types/game.types';
import { getNeighbors, getPlayerConnectedFiefs } from '../map/HexMath';
import { SECONDARY_GODS_TEMPLATES } from '../data/cards.catalog';

export interface RoundHarvestReport {
  playerId: string;
  fiefPoints: number;
  drachmasEarned: number;
}

/**
 * Récolte de Fin de Manche (Manches 1, 2 et 3) :
 * Score de chaque Cité = (Nb types de ressources différents) x (Somme des Puissances)
 */
export function computeEndOfRoundHarvest(
  tiles: HexTile[],
  player: PlayerPublicState,
  activeCapriceId: string | null
): RoundHarvestReport {
  const fiefs = getPlayerConnectedFiefs(tiles, player.id);
  let totalFiefPoints = 0;
  let drachmasEarned = 0;

  const ownedTiles = tiles.filter((t) => t.ownerId === player.id);
  const hasPoseidon = ownedTiles.some(
    (t) => t.building?.category === 'MAJOR_GOD' && t.building.templateId === 'POSEIDON'
  );

  // Cases polluées par Héphaïstos
  const pollutedCoords = new Set<string>();
  for (const t of ownedTiles.filter((x) => x.building?.templateId === 'GOD_05')) {
    for (const n of getNeighbors(tiles, t)) {
      if (n.terrain === 'FOREST' || n.terrain === 'PLAINS') pollutedCoords.add(n.coord);
    }
  }

  for (const fief of fiefs) {
    const uniqueResources = new Set<ResourceType>();
    let fiefPower = activeCapriceId === 'CAP_01' ? 1 : 0; // Caprice Âge d'Or d'Apollon

    for (const tile of fief) {
      // Ressources de base
      if (!pollutedCoords.has(tile.coord) && !tile.disabledNextTurn) {
        if (tile.terrain === 'PLAINS') uniqueResources.add('WHEAT');
        if (tile.terrain === 'FOREST') uniqueResources.add('WOOD');
        if (tile.terrain === 'RIVER') uniqueResources.add('CLAY');
        if (tile.terrain === 'MOUNTAIN_MARBLE') uniqueResources.add('MARBLE');
        if (tile.terrain === 'MOUNTAIN_BRONZE') uniqueResources.add('BRONZE');
        if (tile.terrain === 'SEA') {
          uniqueResources.add('FISH');
          if (hasPoseidon) drachmasEarned += 1;
        }
      }

      // Puissance native du Sanctuaire
      if (tile.terrain === 'SANCTUARY') fiefPower += 1;

      // Bâtiment sur la case
      if (tile.building && !tile.building.isSecondaryHalf) {
        let bPower = tile.building.power;
        const neighbors = getNeighbors(tiles, tile);

        // Synergies & Malus de Puissance
        if (tile.building.templateId === 'BLD_AQUEDUCT') {
          if (neighbors.some((n) => n.terrain === 'PLAINS')) bPower += 1;
          uniqueResources.add('WHEAT');
        }
        if (tile.building.templateId === 'BLD_GOLDSMITH') uniqueResources.add('SACRED_GOLD');
        if (tile.building.templateId === 'GOD_03' || tile.building.templateId === 'GOD_09') {
          uniqueResources.add('VINE');
        }
        if (tile.building.templateId === 'BLD_AGORA') drachmasEarned += 3;
        if (tile.building.templateId === 'GOD_06') drachmasEarned += 3; // Hermès
        if (tile.building.templateId === 'GOD_02') {
          // Apollon : +2 Drachmes si >= 2 voisins sans bâtiment, mais -1 Puissance par bâtiment voisin
          const emptyNeighbors = neighbors.filter((n) => !n.building).length;
          const builtNeighbors = neighbors.filter((n) => n.building !== null).length;
          if (emptyNeighbors >= 2) drachmasEarned += 2;
          bPower = Math.max(0, bPower - builtNeighbors);
        }
        if (tile.building.templateId === 'GOD_07') {
          // Déméter : +1 Puissance par Plaine dans la Cité, -1 si Montagne adjacente
          const plainsInFief = fief.filter((x) => x.terrain === 'PLAINS').length;
          bPower += plainsInFief;
          if (
            neighbors.some(
              (n) => n.terrain === 'MOUNTAIN_MARBLE' || n.terrain === 'MOUNTAIN_BRONZE'
            )
          ) {
            bPower = Math.max(0, bPower - 1);
          }
        }
        // Malus d'ivresse de Dionysos (GOD_09) sur les bâtiments adjacents
        if (
          tile.building.templateId !== 'GOD_09' &&
          neighbors.some((n) => n.building?.templateId === 'GOD_09')
        ) {
          bPower = Math.max(0, bPower - 1);
        }

        fiefPower += bPower;
      }

      // Cartes Marron actives
      for (const buff of tile.activeBrownBuffs) {
        if (buff.addedPower) fiefPower += buff.addedPower;
        if (buff.addedResource) uniqueResources.add(buff.addedResource);
        if (buff.drachmasPerTurn) drachmasEarned += buff.drachmasPerTurn;
      }
    }

    let resourceMultiplier = uniqueResources.size;
    if (activeCapriceId === 'CAP_04') {
      if (uniqueResources.has('VINE')) resourceMultiplier++;
      if (uniqueResources.has('SACRED_GOLD')) resourceMultiplier++;
    }

    totalFiefPoints += resourceMultiplier * fiefPower;
  }

  return {
    playerId: player.id,
    fiefPoints: totalFiefPoints,
    drachmasEarned,
  };
}

/**
 * Décompte Final de Fin de Partie (Après la Manche 3)
 */
export function computeFinalEndgameBonus(
  tiles: HexTile[],
  player: PlayerPublicState,
  majorGods: Record<MajorGodId, MajorGodState>
): number {
  let bonusVP = 0;
  const ownedTiles = tiles.filter((t) => t.ownerId === player.id);
  const fiefs = getPlayerConnectedFiefs(tiles, player.id);

  // 1. Grands Temples (+10 PV chacun)
  const ownedMajorGods = (Object.keys(majorGods) as MajorGodId[]).filter(
    (g) => majorGods[g].ownerId === player.id
  );
  bonusVP += ownedMajorGods.length * 10;

  // 2. Dieux Secondaires (PV fixes + Bonus/Malus de placement)
  for (const tile of ownedTiles) {
    if (tile.building?.category !== 'SECONDARY_GOD') continue;
    const godId = tile.building.templateId;
    const template = SECONDARY_GODS_TEMPLATES.find((g) => g.templateId === godId);
    if (!template) continue;

    bonusVP += template.victoryPoints;
    const neighbors = getNeighbors(tiles, tile);
    const parentFief = fiefs.find((f) => f.some((x) => x.coord === tile.coord)) || [];

    if (godId === 'GOD_01') {
      // Athéna
      bonusVP += neighbors.filter((n) => n.building?.category === 'BUILDING').length * 2;
      if (neighbors.some((n) => n.building?.templateId === 'GOD_04')) bonusVP -= 3;
    }
    if (godId === 'GOD_03') {
      // Artémis
      bonusVP += parentFief.filter((x) => x.terrain === 'FOREST').length * 2;
      bonusVP -= neighbors.filter((n) => n.terrain === 'PLAINS').length * 2;
    }
    if (godId === 'GOD_04') {
      // Arès
      bonusVP += neighbors.filter((n) => n.ownerId && n.ownerId !== player.id).length * 2;
    }
    if (godId === 'GOD_06') {
      // Hermès
      if (parentFief.length < 3) bonusVP -= 4;
    }
    if (godId === 'GOD_08') {
      // Aphrodite
      bonusVP += player.inhabitants.length * 2;
      if (
        parentFief.some(
          (x) => x.building?.templateId === 'GOD_01' || x.building?.templateId === 'GOD_10'
        )
      ) {
        bonusVP -= 5;
      }
    }
    if (godId === 'GOD_10') {
      // Héra
      if (ownedMajorGods.includes('ZEUS')) bonusVP += 6; // Passe de 6 à 12 PV
    }
  }

  // 3. Habitants (Ivoire)
  for (const inhId of player.inhabitants) {
    if (inhId.startsWith('INH_01')) bonusVP += 3;
    if (inhId.startsWith('INH_02')) bonusVP += 2;
    if (inhId.startsWith('INH_03')) {
      const largestFiefBuildings = Math.max(
        0,
        ...fiefs.map((f) => f.filter((t) => t.building && !t.building.isSecondaryHalf).length)
      );
      bonusVP += largestFiefBuildings;
    }
    if (inhId.startsWith('INH_04')) {
      const templesCount =
        ownedMajorGods.length +
        ownedTiles.filter((t) => t.building?.category === 'SECONDARY_GOD').length;
      bonusVP += templesCount * 2;
    }
    if (inhId.startsWith('INH_05')) bonusVP += 4;
    if (inhId.startsWith('INH_06')) {
      bonusVP +=
        ownedTiles.filter((t) => t.terrain === 'PLAINS' || t.terrain === 'RIVER').length * 2;
    }
    if (inhId.startsWith('INH_07')) {
      bonusVP +=
        ownedTiles.filter(
          (t) => t.terrain === 'MOUNTAIN_MARBLE' || t.terrain === 'MOUNTAIN_BRONZE'
        ).length * 2;
    }
    if (inhId.startsWith('INH_08')) {
      bonusVP += ownedTiles.filter((t) => t.terrain === 'SEA').length * 2;
    }
    if (inhId.startsWith('INH_09')) bonusVP += 3;
  }

  // 4. Trésorerie & Faveur Divine
  const drachmaDivisor = player.inhabitants.some((i) => i.startsWith('INH_10')) ? 2 : 5;
  bonusVP += Math.floor(player.drachmas / drachmaDivisor);
  bonusVP += player.olympusFavor;

  return bonusVP;
}
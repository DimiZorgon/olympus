// src/app/page.tsx
'use client';

import React, { useState, useMemo } from 'react';
import {
  CardDefinition,
  EndOfRoundReserveDecision,
  GamePublicState,
  HexTile,
  MajorGodId,
  ResourceType,
  TurnActionCommand,
} from '@/core/types/game.types';
import { MAJOR_GODS_CATALOG } from '@/core/data/cards.catalog';
import { PLAYER_COLORS } from '@/core/data/kaykit.mapper';
import {
  computePlayerResourcePool,
  evaluateCardPlayability,
  RESOURCE_LABELS_FR,
  TERRAIN_LABELS_FR,
} from '@/core/engine/CostCalculator';
import OlympusBoard3D from '@/components/board/OlympusBoard3D';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const CARD_THEMES: Record<
  string,
  { headerBg: string; border: string; badgeBg: string; label: string; icon: string }
> = {
  TERRITORY: {
    headerBg: 'bg-emerald-800 text-emerald-50',
    border: 'border-emerald-600',
    badgeBg: 'bg-emerald-700',
    label: 'Territoire',
    icon: '🚩',
  },
  BUILDING: {
    headerBg: 'bg-blue-800 text-blue-50',
    border: 'border-blue-600',
    badgeBg: 'bg-blue-700',
    label: 'Bâtiment Civil',
    icon: '🏛️',
  },
  SECONDARY_GOD: {
    headerBg: 'bg-purple-900 text-amber-200 border-b border-amber-400',
    border: 'border-purple-600',
    badgeBg: 'bg-purple-800',
    label: 'Sanctuaire Divin',
    icon: '⚡',
  },
  SPECIAL_RESOURCE: {
    headerBg: 'bg-amber-900 text-amber-100',
    border: 'border-amber-700',
    badgeBg: 'bg-amber-800',
    label: 'Ressource Marron',
    icon: '⏳',
  },
  INHABITANT: {
    headerBg: 'bg-yellow-800 text-yellow-50',
    border: 'border-yellow-600',
    badgeBg: 'bg-yellow-700',
    label: 'Habitant (Fin Manche)',
    icon: '👑',
  },
  BONUS: {
    headerBg: 'bg-slate-800 text-slate-100',
    border: 'border-slate-500',
    badgeBg: 'bg-slate-700',
    label: 'Bénédiction',
    icon: '✨',
  },
  MALUS: {
    headerBg: 'bg-rose-900 text-rose-100',
    border: 'border-rose-600',
    badgeBg: 'bg-rose-800',
    label: 'Colère / Malus',
    icon: '🔥',
  },
};

interface RoundHarvestSummary {
  roundNumber: number;
  playersBreakdown: Array<{
    playerId: string;
    playerName: string;
    fiefsCount: number;
    fiefsDetails: Array<{
      coords: string;
      resourcesCount: number;
      power: number;
      points: number;
    }>;
    roundPoints: number;
    drachmasEarned: number;
    newTotalScore: number;
    newDrachmas: number;
    olympusFavor: number;
  }>;
}

export default function OlympusTabletopPage() {
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(2);
  const [game, setGame] = useState<GamePublicState | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [catalog, setCatalog] = useState<Record<string, CardDefinition>>({});
  const [myHandIds, setMyHandIds] = useState<string[]>([]);
  const [myReserveIds, setMyReserveIds] = useState<string[]>([]);
  const [playedCardsIds, setPlayedCardsIds] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  // État du tour & Prévisualisation Optimiste (Combo Carte 1 -> Carte 2)
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [commands, setCommands] = useState<TurnActionCommand[]>([]);
  const [activeCardToPlace, setActiveCardToPlace] = useState<CardDefinition | null>(null);
  const [hoveredCard, setHoveredCard] = useState<CardDefinition | null>(null);
  const [loading, setLoading] = useState(false);

  // Options de caméra & lisibilité du plateau
  const [topDownView, setTopDownView] = useState(false);
  const [showFiefBanners, setShowFiefBanners] = useState(true);

  // Toast d'erreur ou d'action rapide
  const [feedbackToast, setFeedbackToast] = useState<{
    type: 'error' | 'success' | 'info';
    message: string;
  } | null>(null);

  // Modales : Étaler une des 3 piles / Purge Chantier Fin T6 / Récapitulatif Fin de Manche
  const [expandedPileModal, setExpandedPileModal] = useState<
    'RESERVE' | 'PASSIVES' | 'PLAYED' | null
  >(null);
  const [showTurn6CleanupModal, setShowTurn6CleanupModal] = useState(false);
  const [reserveDecisions, setReserveDecisions] = useState<
    Record<string, 'KEEP_PAY_DRACHMAS' | 'BURN'>
  >({});
  const [harvestModalData, setHarvestModalData] = useState<RoundHarvestSummary | null>(null);

  function showToast(type: 'error' | 'success' | 'info', message: string) {
    setFeedbackToast({ type, message });
    setTimeout(() => {
      setFeedbackToast((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  }

  const playerColorMap = useMemo(() => {
    const map: Record<string, (typeof PLAYER_COLORS)[0]> = {};
    if (!game) return map;
    Object.keys(game.players_public).forEach((pid, idx) => {
      map[pid] = PLAYER_COLORS[idx % PLAYER_COLORS.length];
    });
    return map;
  }, [game]);

  const myPlayer = game ? game.players_public[playerId] : null;

  // ============================================================================
  // PRÉVISUALISATION OPTIMISTE DU PLATEAU & DE LA TRÉSORERIE PENDANT LE TOUR
  // Permet de poser un Territoire en Carte 1 et de bâtir dessus en Carte 2 !
  // ============================================================================
  const { optimisticTiles, optimisticDrachmas, optimisticCoords, pendingReserveIds } =
    useMemo(() => {
      if (!game || !myPlayer) {
        return {
          optimisticTiles: [] as HexTile[],
          optimisticDrachmas: 10,
          optimisticCoords: [] as string[],
          pendingReserveIds: [] as string[],
        };
      }
      const tilesClone = structuredClone(game.board_tiles);
      let drachmas = myPlayer.drachmas;
      const optCoords: string[] = [];
      let reserveList = [...myReserveIds];

      for (const cmd of commands) {
        const card = catalog[cmd.cardId];
        if (cmd.actionType === 'DISCARD_FOR_DRACHMAS') {
          drachmas += 3;
        } else if (cmd.actionType === 'MOVE_TO_RESERVE') {
          if (!reserveList.includes(cmd.cardId)) reserveList.push(cmd.cardId);
        } else if (cmd.actionType === 'CLAIM_TERRITORY' && cmd.targetCoord) {
          const t = tilesClone.find((x) => x.coord === cmd.targetCoord);
          if (t && !t.ownerId) {
            t.ownerId = playerId;
            if (t.terrain === 'SEA') drachmas += 1;
            optCoords.push(t.coord);
          }
        } else if (cmd.actionType === 'BUILD_ON_TILE' && cmd.targetCoord && card) {
          const report = evaluateCardPlayability(
            card,
            tilesClone,
            myPlayer,
            drachmas,
            [],
            game.active_caprice_id
          );
          drachmas = Math.max(0, drachmas - report.netDrachmaCost);
          const t = tilesClone.find((x) => x.coord === cmd.targetCoord);
          if (t) {
            if (card.category === 'SPECIAL_RESOURCE') {
              t.activeBrownBuffs.push({
                cardId: card.id,
                templateId: card.templateId,
                name: card.name,
                remainingTurns: card.durationTurns || 3,
                addedResource: card.producedResource,
                addedPower: card.power,
              });
            } else {
              t.building = {
                cardId: card.id,
                templateId: card.templateId,
                name: card.name,
                category: card.category as 'BUILDING' | 'SECONDARY_GOD',
                power: card.power,
              };
            }
            optCoords.push(t.coord);
            reserveList = reserveList.filter((id) => id !== card.id);
          }
        } else if (cmd.actionType === 'PLAY_INHABITANT' && card) {
          const report = evaluateCardPlayability(
            card,
            tilesClone,
            myPlayer,
            drachmas,
            [],
            game.active_caprice_id
          );
          drachmas = Math.max(0, drachmas - report.netDrachmaCost);
          reserveList = reserveList.filter((id) => id !== card.id);
        }
      }

      return {
        optimisticTiles: tilesClone,
        optimisticDrachmas: drachmas,
        optimisticCoords: optCoords,
        pendingReserveIds: reserveList,
      };
    }, [game, myPlayer, commands, catalog, playerId, myReserveIds]);

  // Pool de ressources permanentes en temps réel (incluant les coups préparés ce tour)
  const myResourcePool = useMemo(() => {
    if (!game || !myPlayer) return null;
    return computePlayerResourcePool(
      optimisticTiles,
      myPlayer,
      [],
      game.active_caprice_id
    );
  }, [game, myPlayer, optimisticTiles]);

  // Cases valides qui s'illuminent en vert sur le plateau 3D quand on choisit un bâtiment
  const validTargetCoords = useMemo(() => {
    if (!game || !myPlayer || !activeCardToPlace) return [];
    const report = evaluateCardPlayability(
      activeCardToPlace,
      optimisticTiles,
      myPlayer,
      optimisticDrachmas,
      [],
      game.active_caprice_id
    );
    return report.validTargetCoords;
  }, [game, myPlayer, activeCardToPlace, optimisticTiles, optimisticDrachmas]);

  async function handleStartGame() {
    setLoading(true);
    try {
      const res = await fetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerCount, playerName: 'Architecte' }),
      });
      const data = await res.json();
      if (data.gameId) {
        setPlayerId(data.playerId);
        setCatalog(data.catalog);

        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: g } = await supabase.from('games').select('*').eq('id', data.gameId).single();
        if (g) setGame(g);

        setMyHandIds(data.myHand || []);
        setMyReserveIds([]);
        setPlayedCardsIds([]);
        showToast('info', '🎲 Plateau de 100 hexagones installé ! Choisissez 2 cartes pour ce tour.');
      }
    } finally {
      setLoading(false);
    }
  }

  // ============================================================================
  // INTERACTION RAPIDE STYLE JEU DE PLATEAU (1 CLIC)
  // ============================================================================
  function handlePlayCardAttempt(card: CardDefinition, fromReserve: boolean) {
    if (!game || !myPlayer) return;

    // Si déjà sélectionnée depuis la main, un clic dessus l'annule
    if (!fromReserve && pickedIds.includes(card.id)) {
      setPickedIds(pickedIds.filter((id) => id !== card.id));
      setCommands(commands.filter((c) => c.cardId !== card.id));
      setActiveCardToPlace(null);
      showToast('info', `Action annulée pour « ${card.name} ».`);
      return;
    }

    if (!fromReserve && pickedIds.length >= 2) {
      showToast(
        'error',
        'Vous avez déjà sélectionné vos 2 cartes de la main pour ce tour ! Cliquez sur une carte choisie pour la retirer.'
      );
      return;
    }

    // Diagnostic 7 Wonders : ressources produites + Banque + cases compatibles
    const playability = evaluateCardPlayability(
      card,
      optimisticTiles,
      myPlayer,
      optimisticDrachmas,
      [],
      game.active_caprice_id
    );

    if (!playability.canPlay) {
      showToast('error', playability.errorMessage || 'Action impossible.');
      return;
    }

    // CAS 1 : CARTE TERRITOIRE -> Pose immédiate en 1 seul clic !
    if (card.category === 'TERRITORY' && card.targetCoord) {
      if (!fromReserve) setPickedIds([...pickedIds, card.id]);
      setCommands((prev) => [
        ...prev.filter((c) => c.cardId !== card.id),
        {
          cardId: card.id,
          source: fromReserve ? 'RESERVE' : 'HAND',
          actionType: 'CLAIM_TERRITORY',
          targetCoord: card.targetCoord,
        },
      ]);
      showToast('success', `🚩 Pion posé immédiatement sur l'hexagone ${card.targetCoord} !`);
      return;
    }

    // CAS 2 : HABITANT / BONUS / MALUS -> Activation directe en 1 clic !
    if (
      card.category === 'INHABITANT' ||
      card.category === 'BONUS' ||
      card.category === 'MALUS'
    ) {
      if (!fromReserve) setPickedIds([...pickedIds, card.id]);
      const actionType =
        card.category === 'INHABITANT'
          ? 'PLAY_INHABITANT'
          : card.category === 'BONUS'
          ? 'PLAY_BONUS'
          : 'PLAY_MALUS';
      setCommands((prev) => [
        ...prev.filter((c) => c.cardId !== card.id),
        { cardId: card.id, source: fromReserve ? 'RESERVE' : 'HAND', actionType },
      ]);
      const costText =
        playability.netDrachmaCost > 0 ? ` (-${playability.netDrachmaCost} 🪙)` : ' (Gratuit)';
      showToast('success', `✨ « ${card.name} » activée${costText} !`);
      setExpandedPileModal(null);
      return;
    }

    // CAS 3 : BÂTIMENT / DIEU SECONDAIRE / RESSOURCE MARRON
    // S'il n'y a qu'1 seule case valide sur l'île, on pose dessus en 1 clic ! Sinon on illumine les cases valides.
    if (playability.validTargetCoords.length === 1) {
      const autoCoord = playability.validTargetCoords[0];
      if (!fromReserve && !pickedIds.includes(card.id)) {
        setPickedIds([...pickedIds, card.id]);
      }
      setCommands((prev) => [
        ...prev.filter((c) => c.cardId !== card.id),
        {
          cardId: card.id,
          source: fromReserve ? 'RESERVE' : 'HAND',
          actionType: 'BUILD_ON_TILE',
          targetCoord: autoCoord,
        },
      ]);
      const costLabel =
        playability.netDrachmaCost > 0
          ? `via la Banque (${playability.netDrachmaCost} 🪙)`
          : 'gratuitement grâce à vos ressources';
      showToast(
        'success',
        `🏛️ « ${card.name} » bâti sur votre unique case éligible ${autoCoord} ${costLabel} !`
      );
      setExpandedPileModal(null);
      return;
    }

    // Plusieurs cases compatibles : on active le ciblage vert sur le plateau 3D
    setActiveCardToPlace(card);
    setExpandedPileModal(null);
    showToast(
      'info',
      `👉 Cliquez sur l'un de vos ${playability.validTargetCoords.length} hexagones illuminés en vert sur le plateau pour poser « ${card.name} ».`
    );
  }

  function handleTileClickOnBoard(coord: string) {
    if (!activeCardToPlace) return;

    if (!validTargetCoords.includes(coord)) {
      const allowedText = activeCardToPlace.allowedTerrains
        ? activeCardToPlace.allowedTerrains.map((t) => TERRAIN_LABELS_FR[t]).join(' ou ')
        : 'case libre contrôlée par vous';
      showToast(
        'error',
        `Case ${coord} invalide pour « ${activeCardToPlace.name} » : nécessite une case libre que vous contrôlez (${allowedText}).`
      );
      return;
    }

    const card = activeCardToPlace;
    const fromReserve = myReserveIds.includes(card.id);

    if (!fromReserve && !pickedIds.includes(card.id)) {
      setPickedIds([...pickedIds, card.id]);
    }

    setCommands((prev) => [
      ...prev.filter((c) => c.cardId !== card.id),
      {
        cardId: card.id,
        source: fromReserve ? 'RESERVE' : 'HAND',
        actionType: 'BUILD_ON_TILE',
        targetCoord: coord,
      },
    ]);

    showToast('success', `🏛️ « ${card.name} » construit sur l'hexagone ${coord} !`);
    setActiveCardToPlace(null);
  }

  function handleMoveToReserve(card: CardDefinition) {
    if (pickedIds.includes(card.id)) {
      setPickedIds(pickedIds.filter((id) => id !== card.id));
      setCommands(commands.filter((c) => c.cardId !== card.id));
      return;
    }
    if (pickedIds.length >= 2) {
      showToast('error', 'Vous avez déjà choisi vos 2 cartes pour ce tour.');
      return;
    }
    setPickedIds([...pickedIds, card.id]);
    setCommands((prev) => [
      ...prev.filter((c) => c.cardId !== card.id),
      { cardId: card.id, source: 'HAND', actionType: 'MOVE_TO_RESERVE' },
    ]);
    showToast('info', `🏗️ « ${card.name} » placée dans votre pile Chantier.`);
  }

  function handleDiscardForDrachmas(card: CardDefinition) {
    if (pickedIds.includes(card.id)) {
      setPickedIds(pickedIds.filter((id) => id !== card.id));
      setCommands(commands.filter((c) => c.cardId !== card.id));
      return;
    }
    if (pickedIds.length >= 2) {
      showToast('error', 'Vous avez déjà choisi vos 2 cartes pour ce tour.');
      return;
    }
    if (commands.some((c) => c.actionType === 'DISCARD_FOR_DRACHMAS')) {
      showToast('error', 'Règle : Vous ne pouvez défausser qu’une seule carte contre 3 🪙 par tour !');
      return;
    }
    setPickedIds([...pickedIds, card.id]);
    setCommands((prev) => [
      ...prev.filter((c) => c.cardId !== card.id),
      { cardId: card.id, source: 'HAND', actionType: 'DISCARD_FOR_DRACHMAS' },
    ]);
    showToast('success', `🪙 « ${card.name} » défaussée contre +3 Drachmes.`);
  }

  // Validation du tour (Ouvre la fenêtre de gestion du Chantier si on est au Tour 6 avec des cartes en attente)
  async function handleRequestValidateTurn() {
    if (!game || pickedIds.length !== 2) {
      showToast('error', 'Vous devez sélectionner exactement 2 cartes de votre main avant de valider le tour.');
      return;
    }

    if (game.current_turn === 6 && pendingReserveIds.length > 0 && !showTurn6CleanupModal) {
      const initialDecisions: Record<string, 'KEEP_PAY_DRACHMAS' | 'BURN'> = {};
      pendingReserveIds.forEach((cid) => {
        initialDecisions[cid] = 'KEEP_PAY_DRACHMAS';
      });
      setReserveDecisions(initialDecisions);
      setShowTurn6CleanupModal(true);
      return;
    }

    await executeTurnSubmission();
  }

  async function executeTurnSubmission() {
    if (!game) return;
    setLoading(true);
    setShowTurn6CleanupModal(false);
    try {
      const cleanupArray: EndOfRoundReserveDecision[] = pendingReserveIds.map((cid) => ({
        cardId: cid,
        decision: reserveDecisions[cid] || 'BURN',
      }));

      const res = await fetch('/api/game/submit-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: game.id,
          submission: {
            playerId,
            pickedFromHand: [pickedIds[0], pickedIds[1]],
            commands,
            reserveCleanupDecisions: cleanupArray,
          },
        }),
      });
      const data = await res.json();
      if (data.status === 'TURN_RESOLVED') {
        setGame(data.game);
        setMyHandIds(data.myHand || []);
        setMyReserveIds(data.myReserve || []);
        setPlayedCardsIds((prev) => [...pickedIds, ...prev]);
        setLogs((prev) => [...data.events, ...prev]);
        setPickedIds([]);
        setCommands([]);
        setActiveCardToPlace(null);

        if (data.roundHarvestSummary) {
          setHarvestModalData(data.roundHarvestSummary);
        } else {
          showToast('success', '✔ Tour résolu ! Les mains de draft ont tourné.');
        }
      }
    } finally {
      setLoading(false);
    }
  }

  // ÉCRAN D'ACCUEIL
  if (!game) {
    return (
      <main className="h-screen w-screen tabletop-surface flex items-center justify-center p-6">
        <div className="boardgame-panel max-w-md w-full p-8 rounded-2xl space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-3xl font-black text-[#684C26]">🏛️ OLYMPUS</h1>
            <p className="text-sm text-[#463217]/80">
              Bunny Kingdom × 7 Wonders — Île de 100 Hexagones
            </p>
          </div>
          <div>
            <label className="block font-bold mb-1.5 text-[#463217]">Configuration de la Table :</label>
            <select
              value={playerCount}
              onChange={(e) => setPlayerCount(Number(e.target.value) as 2 | 3 | 4)}
              className="w-full rounded-lg border-2 border-[#684C26] bg-[#F6F5DF] p-2.5 font-semibold text-[#463217]"
            >
              <option value={2}>2 Joueurs (100 Tuiles, Zeus)</option>
              <option value={3}>3 Joueurs (100 Tuiles, Zeus + Poséidon)</option>
              <option value={4}>4 Joueurs (100 Tuiles, Zeus + Poséidon + Hadès)</option>
            </select>
          </div>
          <Button
            onClick={handleStartGame}
            disabled={loading}
            className="w-full bg-[#684C26] hover:bg-[#463217] text-[#F6F5DF] font-bold py-6 text-base rounded-xl cursor-pointer"
          >
            {loading ? 'Mise en place de l’Île...' : 'Installer le Plateau de Jeu'}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <div className="h-screen w-screen tabletop-surface relative overflow-hidden flex flex-col justify-between select-none">
      {/* TOAST D'ERREUR OU DE CONFIRMATION EN HAUT AU CENTRE */}
      {feedbackToast && (
        <div className="fixed top-16 inset-x-0 z-50 flex justify-center pointer-events-none px-4">
          <div
            className={`toast-banner pointer-events-auto max-w-xl px-5 py-3 rounded-2xl border-2 shadow-2xl flex items-center gap-3 text-xs font-bold ${
              feedbackToast.type === 'error'
                ? 'bg-rose-950/95 border-rose-400 text-rose-100'
                : feedbackToast.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-400 text-emerald-100'
                : 'bg-[#463217]/95 border-amber-400 text-[#F6F5DF]'
            }`}
          >
            <span className="text-base">
              {feedbackToast.type === 'error' ? '⚠️' : feedbackToast.type === 'success' ? '✔' : '💡'}
            </span>
            <span className="leading-snug">{feedbackToast.message}</span>
            <button
              onClick={() => setFeedbackToast(null)}
              className="ml-2 opacity-75 hover:opacity-100 text-sm font-black cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 1. BARRE SUPÉRIEURE : MANCHE/TOUR, BOUTONS DE LISIBILITÉ CAMÉRA & JOUEURS */}
      <header className="z-20 px-5 pt-3 flex flex-wrap justify-between items-start gap-3 pointer-events-none">
        <div className="boardgame-panel rounded-xl px-3.5 py-2 pointer-events-auto flex items-center gap-2.5">
          <span className="text-base font-black text-[#684C26]">🏛️ OLYMPUS</span>
          <Badge className="bg-[#684C26] text-[#F6F5DF]">
            Manche {game.current_round}/4 • Tour {game.current_turn}/6
          </Badge>

          {/* Boutons de lisibilité du plateau façon Bunny Kingdom */}
          <button
            onClick={() => setTopDownView(!topDownView)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border transition-colors cursor-pointer ${
              topDownView
                ? 'bg-amber-600 text-white border-amber-800'
                : 'bg-[#e8e5c3] text-[#463217] border-[#684C26]/40 hover:bg-[#d8d3a8]'
            }`}
          >
            {topDownView ? '📐 Vue 3D Inclinée' : '🗺️ Vue Zénithale (2D)'}
          </button>

          <button
            onClick={() => setShowFiefBanners(!showFiefBanners)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border transition-colors cursor-pointer ${
              showFiefBanners
                ? 'bg-emerald-800 text-white border-emerald-950'
                : 'bg-[#e8e5c3] text-[#463217] border-[#684C26]/40'
            }`}
          >
            🏛️ Scores des Cités : {showFiefBanners ? 'ON' : 'OFF'}
          </button>

          {activeCardToPlace && (
            <button
              onClick={() => setActiveCardToPlace(null)}
              className="bg-rose-700 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold animate-pulse cursor-pointer"
            >
              ✕ Annuler ciblage ({activeCardToPlace.name})
            </button>
          )}
        </div>

        {/* Joueurs autour de la table */}
        <div className="flex flex-wrap gap-2 pointer-events-auto">
          {Object.values(game.players_public).map((p) => {
            const isMe = p.id === playerId;
            const c = playerColorMap[p.id];
            return (
              <div
                key={p.id}
                className={`boardgame-panel rounded-xl px-3 py-1.5 flex items-center gap-2.5 text-xs ${
                  isMe ? 'ring-2 ring-amber-500' : ''
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white shadow"
                  style={{ backgroundColor: c?.hex }}
                />
                <div>
                  <div className="font-extrabold text-[#463217]">
                    {p.name} {isMe && '(Vous)'}
                  </div>
                  <div className="text-[10px] text-[#684C26] font-bold">
                    🪙 {isMe ? optimisticDrachmas : p.drachmas} Dr. | ⚡ {p.olympusFavor} Fav. | 🏆{' '}
                    <strong className="text-[#463217]">{p.totalScore} PV</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </header>

      {/* 2. CENTRE : PLATEAU 3D INTERACTIF DE 100 HEXAGONES */}
      <div className="absolute inset-0 z-0">
        <OlympusBoard3D
          tiles={optimisticTiles}
          playerColorMap={playerColorMap}
          primaryCoord=""
          secondaryCoord=""
          hoveredCoord={hoveredCard?.targetCoord}
          validTargetCoords={validTargetCoords}
          optimisticCoords={optimisticCoords}
          isTargetingMode={activeCardToPlace !== null}
          topDownView={topDownView}
          showFiefBanners={showFiefBanners}
          onSelectPrimary={handleTileClickOnBoard}
          onSelectSecondary={() => {}}
        />
      </div>

      {/* 3. BAS DE LA TABLE : TRÉSOR/RESSOURCES (GAUCHE) + ÉVENTAIL (CENTRE) + 3 PILES PHYSIQUES (DROITE) */}
      <footer className="z-20 px-5 pb-3 flex items-end justify-between pointer-events-none gap-4">
        {/* GAUCHE : TRÉSORERIE & CAPACITÉ DE PRODUCTION PERMANENTE (STYLE 7 WONDERS) */}
        <div className="boardgame-panel rounded-2xl p-3 pointer-events-auto w-72 space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="drachma-coin flex items-center justify-center font-black text-sm text-[#463217]">
                🪙
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-[#684C26]">Trésor Disponible</div>
                <div className="text-base font-black text-[#463217]">
                  {optimisticDrachmas} Drachmes
                </div>
              </div>
            </div>
            <div className="text-right bg-[#e8e5c3] px-2 py-1 rounded-lg border border-[#684C26]/30">
              <div className="text-[9px] font-bold uppercase text-[#684C26]">Banque</div>
              <div className="text-xs font-black text-amber-800">
                {myResourcePool?.bankRate ?? 3} 🪙 / ress.
              </div>
            </div>
          </div>

          <div className="border-t border-[#684C26]/20 pt-1.5">
            <div className="text-[10px] font-extrabold text-[#684C26] uppercase mb-1">
              Production Permanente (Cases Contrôlées) :
            </div>
            <div className="grid grid-cols-4 gap-1 text-[11px] font-extrabold text-[#463217] bg-[#e8e5c3] p-1.5 rounded-lg">
              <span title="Blé">🌾 {myResourcePool?.counts.WHEAT || 0}</span>
              <span title="Bois">🪵 {myResourcePool?.counts.WOOD || 0}</span>
              <span title="Argile">🏺 {myResourcePool?.counts.CLAY || 0}</span>
              <span title="Marbre">🏛️ {myResourcePool?.counts.MARBLE || 0}</span>
              <span title="Bronze">🛡️ {myResourcePool?.counts.BRONZE || 0}</span>
              <span title="Poisson">🐟 {myResourcePool?.counts.FISH || 0}</span>
              <span title="Vigne">🍇 {myResourcePool?.counts.VINE || 0}</span>
              <span title="Or Sacré">✨ {myResourcePool?.counts.SACRED_GOLD || 0}</span>
            </div>
          </div>
        </div>

        {/* CENTRE : ÉVENTAIL DE CARTES ULTRA-LISIBLE AVEC COÛTS 7 WONDERS */}
        <div className="card-fan-wrapper pointer-events-auto flex flex-col items-center">
          <div className="flex items-center justify-center h-60 px-4">
            {myHandIds.map((cid, index) => {
              const card = catalog[cid];
              if (!card || !myPlayer) return null;
              const isPicked = pickedIds.includes(cid);
              const chosenCmd = commands.find((c) => c.cardId === cid);
              const theme = CARD_THEMES[card.category] || CARD_THEMES.BUILDING;
              const total = myHandIds.length;
              const offset = index - (total - 1) / 2;

              const playability = evaluateCardPlayability(
                card,
                optimisticTiles,
                myPlayer,
                optimisticDrachmas,
                [],
                game.active_caprice_id
              );

              const costEntries = Object.entries(card.cost || {});

              return (
                <div
                  key={cid}
                  onMouseEnter={() => setHoveredCard(card)}
                  onMouseLeave={() => setHoveredCard(null)}
                  onClick={() => handlePlayCardAttempt(card, false)}
                  style={{
                    transform: `translateY(${isPicked ? -34 : Math.abs(offset) * 3.5}px) rotate(${
                      offset * 3.2
                    }deg)`,
                    marginLeft: index === 0 ? 0 : '-52px',
                    zIndex: isPicked ? 45 : index + 1,
                  }}
                  className={`playing-card border-2 ${theme.border} flex flex-col justify-between overflow-hidden ${
                    isPicked ? 'is-picked ring-4 ring-amber-500' : ''
                  }`}
                >
                  {/* 1. Bandeau de catégorie + Puissance */}
                  <div className={`px-2 py-1 ${theme.headerBg}`}>
                    <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-wider">
                      <span>
                        {theme.icon} {theme.label}
                      </span>
                      {card.power > 0 && (
                        <span className="bg-amber-400 text-slate-950 px-1 rounded font-black">
                          +{card.power}P
                        </span>
                      )}
                    </div>
                    <div className="font-extrabold text-[11px] truncate mt-0.5">{card.name}</div>
                  </div>

                  {/* 2. Bandeau des Coûts en Ressources (Style 7 Wonders) */}
                  <div className="px-2 py-1 bg-[#e8e5c3] border-b border-[#684C26]/20 flex flex-wrap items-center justify-between gap-1">
                    <div className="flex flex-wrap gap-0.5">
                      {costEntries.length === 0 ? (
                        <span className="text-[9px] font-extrabold text-emerald-800">
                          ✔ Coût : Gratuit
                        </span>
                      ) : (
                        costEntries.map(([resKey, qty]) => {
                          if (resKey === 'drachmas') {
                            return (
                              <span
                                key={resKey}
                                className="px-1 py-0.2 rounded bg-amber-300 text-[#463217] text-[8.5px] font-black"
                              >
                                {qty}🪙
                              </span>
                            );
                          }
                          const rKey = resKey as Exclude<ResourceType, 'ANY_BASE'>;
                          const have = myResourcePool?.counts[rKey] || 0;
                          const enough = have >= (qty || 0);
                          const rInfo = RESOURCE_LABELS_FR[rKey];
                          return (
                            <span
                              key={resKey}
                              className={`px-1 py-0.2 rounded text-[8.5px] font-extrabold ${
                                enough
                                  ? 'bg-emerald-700 text-white'
                                  : 'bg-amber-800 text-amber-100'
                              }`}
                            >
                              {qty}
                              {rInfo?.icon}
                            </span>
                          );
                        })
                      )}
                    </div>

                    {/* Voyant de coût net */}
                    {card.category !== 'TERRITORY' && (
                      <span
                        className={`text-[8.5px] font-black px-1 rounded ${
                          !playability.canPlay
                            ? 'bg-rose-800 text-white'
                            : playability.netDrachmaCost === 0
                            ? 'bg-emerald-700 text-white'
                            : 'bg-amber-600 text-white'
                        }`}
                      >
                        {!playability.canPlay
                          ? '🔒 Bloquée'
                          : playability.netDrachmaCost === 0
                          ? '0🪙'
                          : `${playability.netDrachmaCost}🪙`}
                      </span>
                    )}
                  </div>

                  {/* 3. Corps descriptif + Terrains autorisés */}
                  <div className="px-2 py-1 flex-1 flex flex-col justify-between text-[9.5px] text-[#463217]">
                    <p className="line-clamp-3 leading-tight">{card.description}</p>
                    {card.allowedTerrains && (
                      <div className="text-[8px] font-bold text-[#684C26] truncate">
                        Terrain : {card.allowedTerrains.map((t) => TERRAIN_LABELS_FR[t]).join(', ')}
                      </div>
                    )}
                    {chosenCmd && (
                      <div className="bg-amber-500 text-slate-950 font-black text-[8.5px] text-center rounded py-0.5">
                        ✓ {chosenCmd.actionType === 'DISCARD_FOR_DRACHMAS'
                          ? 'Défaussée (+3🪙)'
                          : chosenCmd.actionType === 'MOVE_TO_RESERVE'
                          ? 'Mise au Chantier'
                          : `Jouée ${chosenCmd.targetCoord ? `(${chosenCmd.targetCoord})` : ''}`}
                      </div>
                    )}
                  </div>

                  {/* 4. Boutons d'action immédiate */}
                  <div
                    className="p-1.5 bg-[#e8e5c3]/90 border-t border-[#684C26]/20 flex gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handlePlayCardAttempt(card, false)}
                      className={`flex-1 font-extrabold py-1 rounded text-[9px] cursor-pointer ${
                        playability.canPlay
                          ? 'bg-[#684C26] hover:bg-[#463217] text-[#F6F5DF]'
                          : 'bg-rose-900/80 hover:bg-rose-900 text-rose-100'
                      }`}
                    >
                      {card.category === 'TERRITORY'
                        ? `Poser ${card.targetCoord}`
                        : playability.netDrachmaCost > 0
                        ? `Bâtir (${playability.netDrachmaCost}🪙)`
                        : 'Bâtir (0🪙)'}
                    </button>

                    {(card.category === 'BUILDING' ||
                      card.category === 'SECONDARY_GOD' ||
                      card.category === 'SPECIAL_RESOURCE' ||
                      card.category === 'INHABITANT') && (
                      <button
                        onClick={() => handleMoveToReserve(card)}
                        className="bg-[#F6F5DF] hover:bg-amber-100 border border-[#684C26] text-[#463217] font-bold px-1.5 py-1 rounded text-[8.5px] cursor-pointer"
                        title="Garder en attente au Chantier (gratuit)"
                      >
                        🏗️
                      </button>
                    )}

                    <button
                      onClick={() => handleDiscardForDrachmas(card)}
                      className="bg-amber-300 hover:bg-amber-400 text-[#463217] font-extrabold px-1.5 py-1 rounded text-[8.5px] cursor-pointer"
                      title="Défausser contre +3 Drachmes (max 1/tour)"
                    >
                      +3🪙
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* DROITE : LES 3 PILES DE CARTES PHYSIQUES + VALIDATION DU TOUR */}
        <div className="pointer-events-auto flex flex-col gap-2.5 w-76">
          <div className="grid grid-cols-3 gap-2">
            {/* PILE 1 : CHANTIER / EN ATTENTE */}
            <div
              onClick={() => setExpandedPileModal('RESERVE')}
              className="table-deck-pile p-2.5 flex flex-col items-center justify-between h-24 text-center"
            >
              <span className="text-[9px] font-black uppercase text-[#684C26]">1. Chantier</span>
              <span className="text-2xl font-black text-[#463217]">{pendingReserveIds.length}</span>
              <span className="text-[8.5px] font-bold text-amber-800 underline">
                Étaler les cartes
              </span>
            </div>

            {/* PILE 2 : FIN DE MANCHE & PASSIFS */}
            <div
              onClick={() => setExpandedPileModal('PASSIVES')}
              className="table-deck-pile p-2.5 flex flex-col items-center justify-between h-24 text-center"
            >
              <span className="text-[9px] font-black uppercase text-[#684C26]">2. Passifs</span>
              <span className="text-2xl font-black text-[#463217]">
                {myPlayer?.inhabitants.length || 0}
              </span>
              <span className="text-[8.5px] font-bold text-amber-800 underline">
                Étaler les cartes
              </span>
            </div>

            {/* PILE 3 : CARTES DÉJÀ JOUÉES */}
            <div
              onClick={() => setExpandedPileModal('PLAYED')}
              className="table-deck-pile p-2.5 flex flex-col items-center justify-between h-24 text-center"
            >
              <span className="text-[9px] font-black uppercase text-[#684C26]">3. Jouées</span>
              <span className="text-2xl font-black text-[#463217]">{playedCardsIds.length}</span>
              <span className="text-[8.5px] font-bold text-amber-800 underline">
                Voir l&apos;historique
              </span>
            </div>
          </div>

          {/* Barre de validation du tour */}
          <div className="boardgame-panel rounded-xl p-2.5 flex gap-2 items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPickedIds([]);
                setCommands([]);
                setActiveCardToPlace(null);
              }}
              disabled={pickedIds.length === 0}
              className="border-[#684C26] text-[#684C26] text-xs cursor-pointer"
            >
              Réinitialiser ({pickedIds.length}/2)
            </Button>
            <Button
              size="sm"
              onClick={handleRequestValidateTurn}
              disabled={pickedIds.length !== 2 || loading}
              className="flex-1 bg-[#684C26] hover:bg-[#463217] text-[#F6F5DF] font-black text-xs cursor-pointer"
            >
              {loading ? 'Résolution...' : '✔ Valider mon Tour (2/2)'}
            </Button>
          </div>
        </div>
      </footer>

      {/* ============================================================================
          MODALE 1 : ÉTALEMENT EN GRAND AU MILIEU DE L'ÉCRAN DE L'UNE DES 3 PILES
         ============================================================================ */}
      {expandedPileModal && (
        <div
          onClick={() => setExpandedPileModal(null)}
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="boardgame-panel max-w-4xl w-full rounded-2xl p-6 max-h-[82vh] flex flex-col gap-4"
          >
            <div className="flex justify-between items-center border-b border-[#684C26]/30 pb-3">
              <div>
                <h2 className="text-xl font-black text-[#684C26]">
                  {expandedPileModal === 'RESERVE' &&
                    `🏗️ Pile 1 : Vos Cartes en Attente au Chantier (${pendingReserveIds.length})`}
                  {expandedPileModal === 'PASSIVES' &&
                    `🏆 Pile 2 : Vos Cartes Fin de Manche & Habitants Actifs (${
                      myPlayer?.inhabitants.length || 0
                    })`}
                  {expandedPileModal === 'PLAYED' &&
                    `📦 Pile 3 : Historique de vos Cartes Déjà Jouées (${playedCardsIds.length})`}
                </h2>
                <p className="text-xs text-[#463217]/80">
                  {expandedPileModal === 'RESERVE'
                    ? 'Vous pouvez construire ces cartes à n’importe quel tour. À la fin du Tour 6, conserver une carte coûte 5 🪙.'
                    : 'Ces cartes sont déjà en jeu ou résolues.'}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setExpandedPileModal(null)}
                className="border-[#684C26] text-[#684C26] font-bold cursor-pointer"
              >
                Fermer ✕
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 overflow-y-auto p-2">
              {(expandedPileModal === 'RESERVE'
                ? pendingReserveIds
                : expandedPileModal === 'PASSIVES'
                ? myPlayer?.inhabitants || []
                : playedCardsIds
              ).map((cid) => {
                const c = catalog[cid];
                if (!c) return null;
                const theme = CARD_THEMES[c.category] || CARD_THEMES.BUILDING;
                return (
                  <div
                    key={cid}
                    className={`bg-[#F6F5DF] border-2 ${theme.border} rounded-xl overflow-hidden flex flex-col justify-between shadow-lg min-h-[190px]`}
                  >
                    <div className={`p-2 ${theme.headerBg}`}>
                      <div className="text-[9px] font-black uppercase">{theme.label}</div>
                      <div className="font-extrabold text-xs">{c.name}</div>
                    </div>
                    <div className="p-2.5 text-xs text-[#463217] flex-1">
                      <p>{c.description}</p>
                    </div>
                    {expandedPileModal === 'RESERVE' && (
                      <div className="p-2 bg-[#e8e5c3] border-t border-[#684C26]/20">
                        <Button
                          size="sm"
                          onClick={() => handlePlayCardAttempt(c, true)}
                          className="w-full bg-[#684C26] hover:bg-[#463217] text-[#F6F5DF] font-bold text-xs cursor-pointer"
                        >
                          Construire maintenant
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================
          MODALE 2 (FIN DU TOUR 6) : GESTION DU CHANTIER (CONSTRUIRE / GARDER 5🪙 / DÉTRUIRE)
         ============================================================================ */}
      {showTurn6CleanupModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="boardgame-panel max-w-2xl w-full rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-black text-[#684C26]">
              🏗️ Fin de la Manche {game.current_round} — Purge de votre Zone de Chantier
            </h2>
            <p className="text-xs text-[#463217]">
              Le Tour 6 est terminé ! Pour chaque carte encore en attente dans votre Chantier,
              choisissez si vous souhaitez la **conserver pour la manche suivante (5 🪙)** ou la
              **détruire gratuitement (0 🪙)** :
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pendingReserveIds.map((cid) => {
                const c = catalog[cid];
                if (!c) return null;
                const decision = reserveDecisions[cid] || 'KEEP_PAY_DRACHMAS';
                return (
                  <div
                    key={cid}
                    className="flex items-center justify-between bg-[#F6F5DF] border border-[#684C26] rounded-xl p-3 text-xs"
                  >
                    <div>
                      <div className="font-extrabold text-[#463217]">{c.name}</div>
                      <div className="text-[10px] text-[#684C26]">{c.description}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setReserveDecisions((prev) => ({
                            ...prev,
                            [cid]: 'KEEP_PAY_DRACHMAS',
                          }))
                        }
                        className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                          decision === 'KEEP_PAY_DRACHMAS'
                            ? 'bg-emerald-700 text-white'
                            : 'bg-[#e8e5c3] text-[#463217]'
                        }`}
                      >
                        Conserver (-5 🪙)
                      </button>
                      <button
                        onClick={() =>
                          setReserveDecisions((prev) => ({ ...prev, [cid]: 'BURN' }))
                        }
                        className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                          decision === 'BURN'
                            ? 'bg-rose-700 text-white'
                            : 'bg-[#e8e5c3] text-[#463217]'
                        }`}
                      >
                        Détruire (0 🪙)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-[#684C26]/20">
              <Button
                variant="outline"
                onClick={() => setShowTurn6CleanupModal(false)}
                className="border-[#684C26] text-[#684C26] cursor-pointer"
              >
                Retour au plateau (Construire avant la fin)
              </Button>
              <Button
                onClick={executeTurnSubmission}
                className="bg-[#684C26] hover:bg-[#463217] text-[#F6F5DF] font-black cursor-pointer"
              >
                Confirmer & Calculer la Récolte de la Manche
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================
          MODALE 3 : TABLEAU COMPLET DE RÉCOLTE DE FIN DE MANCHE (STYLE BUNNY KINGDOM)
         ============================================================================ */}
      {harvestModalData && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-6">
          <div className="boardgame-panel max-w-3xl w-full rounded-2xl p-6 space-y-5">
            <div className="text-center border-b border-[#684C26]/30 pb-3">
              <h2 className="text-2xl font-black text-[#684C26]">
                🌾 Récolte de la Manche {harvestModalData.roundNumber} / 4
              </h2>
              <p className="text-xs text-[#463217]/80">
                Chaque Cité connectée rapporte : (Nombre de Ressources Différentes) × (Puissance
                totale des Bâtiments)
              </p>
            </div>

            <div className="space-y-3 max-h-[55vh] overflow-y-auto">
              {harvestModalData.playersBreakdown.map((p) => (
                <div
                  key={p.playerId}
                  className="bg-[#F6F5DF] border-2 border-[#684C26] rounded-xl p-4 space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-base font-black text-[#463217]">{p.playerName}</span>
                    <div className="flex gap-3 text-xs font-extrabold">
                      <span className="bg-emerald-800 text-white px-2.5 py-1 rounded-lg">
                        +{p.roundPoints} PV cette manche
                      </span>
                      <span className="bg-amber-500 text-slate-950 px-2.5 py-1 rounded-lg">
                        +{p.drachmasEarned} 🪙 récoltées
                      </span>
                      <span className="bg-[#684C26] text-[#F6F5DF] px-2.5 py-1 rounded-lg">
                        Total : {p.newTotalScore} PV
                      </span>
                    </div>
                  </div>

                  {p.fiefsDetails.length === 0 ? (
                    <div className="text-xs italic text-[#684C26]">Aucune Cité contrôlée.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {p.fiefsDetails.map((f, i) => (
                        <div
                          key={i}
                          className="bg-[#e8e5c3] rounded-lg p-2 text-xs flex justify-between items-center border border-[#684C26]/30"
                        >
                          <div>
                            <div className="font-bold text-[#463217]">
                              Cité #{i + 1} ({f.coords})
                            </div>
                            <div className="text-[10px] text-[#684C26]">
                              {f.resourcesCount} Ressources diff. × {f.power} Puissance
                            </div>
                          </div>
                          <span className="font-black text-sm text-emerald-900">
                            +{f.points} PV
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Button
              onClick={() => setHarvestModalData(null)}
              className="w-full bg-[#684C26] hover:bg-[#463217] text-[#F6F5DF] font-black py-6 text-base rounded-xl cursor-pointer"
            >
              {game.status === 'FINISHED'
                ? '🏆 Voir le Classement Final'
                : `Passer à la Manche ${game.current_round} →`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
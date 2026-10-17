'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  CardDefinition,
  GamePublicState,
  MajorGodId,
  TurnActionCommand,
} from '@/core/types/game.types';
import { GameBoard } from '@/components/GameBoard';
import { GameHud } from '@/components/GameHud';
import { DraftHand } from '@/components/DraftHand';
import { MajorGodsPanel } from '@/components/MajorGodsPanel';
import { ReservePanel } from '@/components/ReservePanel';
import { EventLog } from '@/components/EventLog';
import { generateProceduralIsland } from '@/core/map/IslandGenerator';
import { buildScaledDeck, MAJOR_GODS_CATALOG } from '@/core/data/cards.catalog';

export default function OlympusGamePlayPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;

  const [game, setGame] = useState<GamePublicState | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [catalog, setCatalog] = useState<Record<string, CardDefinition>>({});
  const [myHandIds, setMyHandIds] = useState<string[]>([]);
  const [myReserveIds, setMyReserveIds] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  // État local des sélections du tour
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [commands, setCommands] = useState<TurnActionCommand[]>([]);
  const [selectedCoord, setSelectedCoord] = useState<string>('');
  const [secondaryCoord, setSecondaryCoord] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function initGameSession() {
      // 1. Lire playerId et catalog depuis sessionStorage si disponibles
      let storedPlayerId = '';
      let storedCatalog: Record<string, CardDefinition> = {};

      if (typeof window !== 'undefined') {
        storedPlayerId = sessionStorage.getItem(`olympus_player_${gameId}`) || '';
        const catStr = sessionStorage.getItem(`olympus_catalog_${gameId}`);
        if (catStr) {
          try {
            storedCatalog = JSON.parse(catStr);
          } catch {}
        }
      }

      // 2. Tenter de charger depuis Supabase
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const key =
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
          '';
        if (!url || !key) return;
        const supabase = createClient(url, key);
        const { data: gData } = await supabase.from('games').select('*').eq('id', gameId).single();

        if (gData) {
          setGame(gData as GamePublicState);
          const pId = storedPlayerId || Object.keys(gData.players_public)[0];
          setPlayerId(pId);

          const { data: handRow } = await supabase
            .from('player_private_hands')
            .select('*')
            .eq('game_id', gameId)
            .eq('player_id', pId)
            .single();

          if (handRow) {
            setMyHandIds(handRow.hand_card_ids || []);
            setMyReserveIds(handRow.reserve_card_ids || []);
          }

          if (Object.keys(storedCatalog).length > 0) {
            setCatalog(storedCatalog);
          }
          setLogs(['Partie synchronisée. Choisissez 2 cartes pour débuter le tour.']);
          return;
        }
      } catch {
        // Fallback local hors ligne
      }

      // 3. Fallback d'initialisation locale si Supabase non connecté
      const defaultTiles = generateProceduralIsland(2);
      const { allCardsMap, shuffledDeckIds } = buildScaledDeck(defaultTiles, 2);
      const fallbackPId = storedPlayerId || 'p_human';

      const initialGameState: GamePublicState = {
        id: gameId,
        room_code: 'LOCAL1',
        status: 'IN_PROGRESS',
        player_count: 2,
        current_round: 1,
        current_turn: 1,
        enable_caprice_r3: true,
        active_caprice_id: null,
        major_gods_state: {
          ZEUS: { available: true, ownerId: null, coords: null },
          POSEIDON: { available: false, ownerId: null, coords: null },
          HADES: { available: false, ownerId: null, coords: null },
        },
        board_tiles: defaultTiles,
        players_public: {
          [fallbackPId]: {
            id: fallbackPId,
            name: 'Architecte',
            isBot: false,
            isAfk: false,
            drachmas: 10,
            olympusFavor: 0,
            scoreHistory: [],
            totalScore: 0,
            reserveCount: 0,
            inhabitants: [],
            malusesUsedOnMeThisRound: 0,
            isReady: false,
          },
          bot_1: {
            id: 'bot_1',
            name: 'Automate Olympien #1',
            isBot: true,
            isAfk: false,
            drachmas: 10,
            olympusFavor: 0,
            scoreHistory: [],
            totalScore: 0,
            reserveCount: 0,
            inhabitants: [],
            malusesUsedOnMeThisRound: 0,
            isReady: false,
          },
        },
      };

      setGame(initialGameState);
      setPlayerId(fallbackPId);
      setCatalog(allCardsMap);
      setMyHandIds(shuffledDeckIds.slice(0, 12));
      setMyReserveIds([]);
      setLogs(['Partie lancée en mode Solo + Bot. Choisissez vos 2 cartes.']);
    }

    initGameSession();
  }, [gameId]);

  function handlePickCard(card: CardDefinition, mode: 'PLAY' | 'RESERVE' | 'DISCARD') {
    if (!pickedIds.includes(card.id)) {
      if (pickedIds.length >= 2) {
        alert('Vous avez déjà sélectionné vos 2 cartes pour ce tour.');
        return;
      }
      setPickedIds([...pickedIds, card.id]);
    }

    let actionType: TurnActionCommand['actionType'] = 'MOVE_TO_RESERVE';
    if (mode === 'DISCARD') actionType = 'DISCARD_FOR_DRACHMAS';
    else if (mode === 'RESERVE') actionType = 'MOVE_TO_RESERVE';
    else {
      if (card.category === 'TERRITORY') actionType = 'CLAIM_TERRITORY';
      else if (card.category === 'BONUS') actionType = 'PLAY_BONUS';
      else if (card.category === 'MALUS') actionType = 'PLAY_MALUS';
      else if (card.category === 'INHABITANT') actionType = 'PLAY_INHABITANT';
      else actionType = 'BUILD_ON_TILE';
    }

    setCommands([
      ...commands.filter((c) => c.cardId !== card.id),
      {
        cardId: card.id,
        source: 'HAND',
        actionType,
        targetCoord: card.targetCoord || selectedCoord || undefined,
      },
    ]);
  }

  function handleBuildFromReserve(card: CardDefinition) {
    if (!selectedCoord) {
      alert('Veuillez sélectionner un hexagone cible sur le plateau.');
      return;
    }
    setCommands([
      ...commands.filter((c) => c.cardId !== card.id),
      {
        cardId: card.id,
        source: 'RESERVE',
        actionType: card.category === 'INHABITANT' ? 'PLAY_INHABITANT' : 'BUILD_ON_TILE',
        targetCoord: selectedCoord,
      },
    ]);
    alert(`Ordre de construction ajouté pour ${card.name} sur ${selectedCoord}.`);
  }

  function handleClaimMajorGod(godId: MajorGodId) {
    if (!selectedCoord || !secondaryCoord) {
      alert('Sélectionnez les 2 coordonnées adjacentes (Case 1 et Case 2) avant de revendiquer.');
      return;
    }

    setCommands([
      ...commands.filter((c) => c.cardId !== godId),
      {
        cardId: godId,
        source: 'MAJOR_GOD',
        actionType: 'CLAIM_MAJOR_GOD',
        targetCoord: selectedCoord,
        secondaryTargetCoord: secondaryCoord,
      },
    ]);
    alert(`Ordre de revendication de ${MAJOR_GODS_CATALOG[godId].name} ajouté !`);
  }

  async function handleSubmitTurn() {
    if (!game || pickedIds.length !== 2) {
      alert('Veuillez choisir exactement 2 cartes de votre main.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/game/submit-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: game.id,
          submission: {
            playerId,
            pickedFromHand: [pickedIds[0], pickedIds[1]],
            commands,
            reserveCleanupDecisions: myReserveIds.map((cid) => ({
              cardId: cid,
              decision: 'KEEP_PAY_DRACHMAS',
            })),
          },
        }),
      });

      const data = await res.json();
      if (data.status === 'TURN_RESOLVED') {
        setGame(data.game);
        setMyHandIds(data.myHand || []);
        setMyReserveIds(data.myReserve || []);
        setLogs((prev) => [...data.events, ...prev]);
        setPickedIds([]);
        setCommands([]);
      } else if (data.status === 'WAITING_FOR_OTHERS') {
        setLogs((prev) => ['Coup enregistré. En attente des autres joueurs...', ...prev]);
      } else if (data.error) {
        throw new Error(data.error);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erreur de soumission');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleAfk() {
    if (!game) return;
    try {
      const res = await fetch('/api/game/afk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: game.id, playerId }),
      });
      const data = await res.json();
      if (data.game) setGame(data.game);
      if (data.events) setLogs((prev) => [...data.events, ...prev]);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erreur bascule AFK');
    }
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-spin">⚡</div>
          <p className="text-sm font-semibold text-slate-300">
            Invocation de l&apos;Olympe en cours...
          </p>
        </div>
      </div>
    );
  }

  const handCards = myHandIds.map((id) => catalog[id]).filter(Boolean);
  const reserveCards = myReserveIds.map((id) => catalog[id]).filter(Boolean);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      {/* 1. HUD & Entête */}
      <GameHud game={game} currentPlayerId={playerId} onToggleAfk={handleToggleAfk} />

      {/* 2. Panneau des Dieux Majeurs */}
      <MajorGodsPanel
        majorGodsState={game.major_gods_state}
        players={game.players_public}
        selectedCoord={selectedCoord}
        secondaryCoord={secondaryCoord}
        onClaimMajorGod={handleClaimMajorGod}
      />

      {/* 3. Plateau SVG Interactif avec frontières fusionnées */}
      <GameBoard
        tiles={game.board_tiles}
        players={game.players_public}
        currentPlayerId={playerId}
        selectedCoord={selectedCoord}
        secondaryCoord={secondaryCoord}
        onSelectCoord={setSelectedCoord}
        onSelectSecondaryCoord={setSecondaryCoord}
      />

      {/* 4. Zone de Chantier (Réserve) */}
      <ReservePanel
        reserveCards={reserveCards}
        selectedCoord={selectedCoord}
        onBuildFromReserve={handleBuildFromReserve}
        isTour6={game.current_turn === 6}
      />

      {/* 5. Main de Draft */}
      <DraftHand
        handCards={handCards}
        pickedIds={pickedIds}
        selectedCoord={selectedCoord}
        onPickCard={handlePickCard}
        onResetPicks={() => {
          setPickedIds([]);
          setCommands([]);
        }}
        onSubmitTurn={handleSubmitTurn}
        isSubmitting={isSubmitting}
      />

      {/* 6. Journal des Événements */}
      <EventLog logs={logs} />
    </main>
  );
}


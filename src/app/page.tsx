// src/app/page.tsx
'use client';

import React, { useState } from 'react';
import {
  CardDefinition,
  GamePublicState,
  MajorGodId,
  TurnActionCommand,
} from '@/core/types/game.types';
import { MAJOR_GODS_CATALOG } from '@/core/data/cards.catalog';

export default function OlympusCorePrototypePage() {
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(2);
  const [enableCaprice, setEnableCaprice] = useState(true);
  const [game, setGame] = useState<GamePublicState | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [catalog, setCatalog] = useState<Record<string, CardDefinition>>({});
  const [myHandIds, setMyHandIds] = useState<string[]>([]);
  const [myReserveIds, setMyReserveIds] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  // État local de planification du tour
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [commands, setCommands] = useState<TurnActionCommand[]>([]);
  const [selectedTargetCoord, setSelectedTargetCoord] = useState<string>('');
  const [secondaryCoord, setSecondaryCoord] = useState<string>('');

  async function startNewGame() {
    const res = await fetch('/api/game/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerCount,
        playerName: 'Joueur 1',
        enableCapriceR3: enableCaprice,
      }),
    });
    const data = await res.json();
    if (data.gameId) {
      setPlayerId(data.playerId);
      setCatalog(data.catalog);
      // Premier tour à vide ou récupération initiale via submit ou state
      await loadInitialState(data.gameId, data.playerId, data.catalog);
    }
  }

  async function loadInitialState(
    gId: string,
    pId: string,
    cat: Record<string, CardDefinition>
  ) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: g } = await supabase.from('games').select('*').eq('id', gId).single();
    setGame(g);

    // En prototype local sans Auth anonyme forcée, on lit les cartes TER/BLD depuis le catalog
    const allIds = Object.keys(cat);
    setMyHandIds(allIds.slice(0, 12));
    setMyReserveIds([]);
    setLogs(['Partie initialisée. Choisissez 2 cartes par tour.']);
  }

  function addCardCommand(
    card: CardDefinition,
    fromReserve: boolean,
    mode: 'PLAY' | 'RESERVE' | 'DISCARD'
  ) {
    if (!fromReserve && !pickedIds.includes(card.id)) {
      if (pickedIds.length >= 2) {
        alert('Vous avez déjà choisi vos 2 cartes de la main pour ce tour.');
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
        source: fromReserve ? 'RESERVE' : 'HAND',
        actionType,
        targetCoord: card.targetCoord || selectedTargetCoord || undefined,
      },
    ]);
  }

  function addMajorGodCommand(godId: MajorGodId) {
    if (!selectedTargetCoord || !secondaryCoord) {
      alert('Sélectionnez les 2 coordonnées adjacentes (Case 1 et Case 2) avant de revendiquer ce Dieu.');
      return;
    }
    setCommands([
      ...commands,
      {
        cardId: godId,
        source: 'MAJOR_GOD',
        actionType: 'CLAIM_MAJOR_GOD',
        targetCoord: selectedTargetCoord,
        secondaryTargetCoord: secondaryCoord,
      },
    ]);
  }

  async function submitTurn() {
    if (!game || pickedIds.length !== 2) {
      alert('Vous devez choisir exactement 2 cartes de votre main.');
      return;
    }
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
      setMyHandIds(data.myHand);
      setMyReserveIds(data.myReserve);
      setLogs((prev) => [...data.events, ...prev]);
      setPickedIds([]);
      setCommands([]);
    }
  }

  if (!game) {
    return (
      <div className="p-6 font-mono text-sm space-y-4">
        <h1 className="text-xl font-bold">OLYMPUS — Prototype Core (Sans Design)</h1>
        <div className="space-x-4">
          <label>
            Nombre de joueurs (avec Bots) :
            <select
              value={playerCount}
              onChange={(e) => setPlayerCount(Number(e.target.value) as 2 | 3 | 4)}
              className="border ml-2 p-1"
            >
              <option value={2}>2 Joueurs (40 tuiles, 72 cartes, Zeus)</option>
              <option value={3}>3 Joueurs (55 tuiles, 108 cartes, Zeus + Poséidon)</option>
              <option value={4}>4 Joueurs (70 tuiles, 144 cartes, Zeus + Poséidon + Hadès)</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={enableCaprice}
              onChange={(e) => setEnableCaprice(e.target.checked)}
              className="mr-1"
            />
            Activer Caprice des Dieux (Manche 3)
          </label>
          <button onClick={startNewGame} className="border px-3 py-1 bg-black text-white">
            Lancer la Partie
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 font-mono text-xs space-y-4">
      {/* BANDEAU D'ÉTAT PUBLIC */}
      <div className="border p-2 flex justify-between items-center">
        <div>
          <strong>MANCHE {game.current_round} / 3</strong> —{' '}
          <strong>TOUR {game.current_turn} / 6</strong> | Statut : {game.status}
          {game.active_caprice_id && ` | Caprice Actif : ${game.active_caprice_id}`}
        </div>
        <div className="flex gap-4">
          {Object.values(game.players_public).map((p) => (
            <div key={p.id} className="border px-2 py-1">
              <strong>{p.name}</strong> | 💰 {p.drachmas} Dr. | ⚡ Faveur :{' '}
              <strong>{p.olympusFavor}</strong> | 🏛️ Chantier : {p.reserveCount} | 🏆{' '}
              <strong>{p.totalScore} PV</strong>
            </div>
          ))}
        </div>
      </div>

      {/* DIEUX MAJEURS (BORD DU PLATEAU) */}
      <div className="border p-2 space-y-1">
        <strong>GRANDS TEMPLES (2 Hexagones adjacents — Priorité à la Faveur Divine) :</strong>
        <div className="flex gap-4">
          {(['ZEUS', 'POSEIDON', 'HADES'] as MajorGodId[]).map((gId) => {
            const st = game.major_gods_state[gId];
            const def = MAJOR_GODS_CATALOG[gId];
            return (
              <div key={gId} className="border p-2">
                <div>
                  <strong>{def.name}</strong> ({st.available ? 'DISPONIBLE' : `Bâti par ${st.ownerId?.slice(0, 6)}`})
                </div>
                <div>{def.description}</div>
                {st.available && (
                  <button
                    onClick={() => addMajorGodCommand(gId)}
                    className="border px-2 py-0.5 mt-1"
                  >
                    Revendiquer sur [{selectedTargetCoord || '?'}] + [{secondaryCoord || '?'}]
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SÉLECTEUR DE COORDONNÉES & GRILLE D'HEXAGONES */}
      <div className="border p-2 space-y-2">
        <div className="flex gap-4 items-center">
          <strong>PLATEAU ({game.board_tiles.length} Hexagones)</strong>
          <span>Case Cible 1 : <strong>{selectedTargetCoord || 'Aucune'}</strong></span>
          <span>Case Cible 2 (Grand Temple) : <strong>{secondaryCoord || 'Aucune'}</strong></span>
        </div>
        <div className="grid grid-cols-10 gap-1">
          {game.board_tiles.map((tile) => {
            const isMine = tile.ownerId === playerId;
            return (
              <div
                key={tile.coord}
                onClick={() => setSelectedTargetCoord(tile.coord)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setSecondaryCoord(tile.coord);
                }}
                className={`border p-1 cursor-pointer ${
                  isMine ? 'border-black font-bold bg-gray-200' : ''
                }`}
              >
                <div>
                  {tile.coord} [{tile.terrain.slice(0, 4)}]
                </div>
                <div className="text-[10px]">
                  {tile.ownerId
                    ? game.players_public[tile.ownerId]?.name.slice(0, 8)
                    : 'Libre'}
                </div>
                {tile.building && (
                  <div className="text-[10px] underline">
                    🏛️ {tile.building.name.slice(0, 12)} (+{tile.building.power}P)
                  </div>
                )}
                {tile.activeBrownBuffs.map((b) => (
                  <div key={b.cardId} className="text-[10px]">
                    ⏳ {b.name.slice(0, 10)} ({b.remainingTurns}t)
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* ZONE DE CHANTIER (RÉSERVE) */}
      <div className="border p-2">
        <strong>
          MA ZONE DE CHANTIER ({myReserveIds.length} cartes — 5 Dr./carte non construite à la fin du Tour 6) :
        </strong>
        <div className="flex gap-2 mt-1 flex-wrap">
          {myReserveIds.map((cid) => {
            const c = catalog[cid];
            if (!c) return null;
            return (
              <div key={cid} className="border p-2 w-56">
                <div className="font-bold">{c.name}</div>
                <div>{c.description}</div>
                <button
                  onClick={() => addCardCommand(c, true, 'PLAY')}
                  className="border px-2 py-0.5 mt-1"
                >
                  Construire sur [{selectedTargetCoord || '?'}]
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* MAIN DU JOUEUR (ÉVENTAIL DE DRAFT) */}
      <div className="border p-2 space-y-2">
        <div className="flex justify-between items-center">
          <strong>
            MA MAIN DE DRAFT ({myHandIds.length} cartes) — Cartes choisies : {pickedIds.length} / 2
          </strong>
          <div className="space-x-2">
            <button
              onClick={() => {
                setPickedIds([]);
                setCommands([]);
              }}
              className="border px-2 py-1"
            >
              Annuler (Undo)
            </button>
            <button
              onClick={submitTurn}
              className="border px-3 py-1 bg-black text-white font-bold"
            >
              Valider mes 2 Cartes & Résoudre le Tour
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {myHandIds.map((cid) => {
            const c = catalog[cid];
            if (!c) return null;
            const isPicked = pickedIds.includes(cid);
            return (
              <div
                key={cid}
                className={`border p-2 space-y-1 ${isPicked ? 'bg-gray-200 border-black' : ''}`}
              >
                <div className="font-bold">
                  [{c.category}] {c.name}
                </div>
                <div>Coût : {JSON.stringify(c.cost)}</div>
                <div>{c.description}</div>
                {c.bonusText && <div>Bonus : {c.bonusText}</div>}
                {c.malusText && <div>Malus : {c.malusText}</div>}
                <div className="flex gap-1 pt-1 flex-wrap">
                  <button
                    onClick={() => addCardCommand(c, false, 'PLAY')}
                    className="border px-1.5 py-0.5"
                  >
                    Jouer {c.targetCoord ? `(${c.targetCoord})` : `sur [${selectedTargetCoord || '?'}]`}
                  </button>
                  {(c.category === 'BUILDING' ||
                    c.category === 'SECONDARY_GOD' ||
                    c.category === 'SPECIAL_RESOURCE' ||
                    c.category === 'INHABITANT') && (
                    <button
                      onClick={() => addCardCommand(c, false, 'RESERVE')}
                      className="border px-1.5 py-0.5"
                    >
                      Chantier (Réserve)
                    </button>
                  )}
                  <button
                    onClick={() => addCardCommand(c, false, 'DISCARD')}
                    className="border px-1.5 py-0.5"
                  >
                    Défausser (+3 Dr.)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* JOURNAL D'ÉVÉNEMENTS */}
      <div className="border p-2 h-36 overflow-y-auto">
        <strong>JOURNAL DES TOURS :</strong>
        {logs.map((l, i) => (
          <div key={i}>• {l}</div>
        ))}
      </div>
    </div>
  );
}
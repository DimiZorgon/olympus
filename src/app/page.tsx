// src/app/page.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  CardDefinition,
  GamePublicState,
  MajorGodId,
  TurnActionCommand,
} from '@/core/types/game.types';
import { MAJOR_GODS_CATALOG } from '@/core/data/cards.catalog';
import { PLAYER_COLORS } from '@/core/data/kaykit.mapper';
import OlympusBoard3D, { Pawn3D } from '@/components/board/OlympusBoard3D';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const CATEGORY_BADGES: Record<string, { label: string; bg: string }> = {
  TERRITORY: { label: 'Territoire', bg: 'bg-emerald-700 text-white' },
  BUILDING: { label: 'Bâtiment', bg: 'bg-blue-700 text-white' },
  SECONDARY_GOD: { label: 'Dieu', bg: 'bg-purple-800 text-white' },
  SPECIAL_RESOURCE: { label: 'Ressource', bg: 'bg-amber-900 text-white' },
  INHABITANT: { label: 'Habitant', bg: 'bg-yellow-700 text-white' },
  BONUS: { label: 'Bonus', bg: 'bg-slate-700 text-white' },
  MALUS: { label: 'Malus', bg: 'bg-rose-700 text-white' },
};

export default function OlympusTabletopPage() {
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(2);
  const [enableCaprice, setEnableCaprice] = useState(true);
  const [useGltfAssets, setUseGltfAssets] = useState(false);

  const [game, setGame] = useState<GamePublicState | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [catalog, setCatalog] = useState<Record<string, CardDefinition>>({});
  const [myHandIds, setMyHandIds] = useState<string[]>([]);
  const [myReserveIds, setMyReserveIds] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  // État du tour
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [commands, setCommands] = useState<TurnActionCommand[]>([]);
  const [primaryCoord, setPrimaryCoord] = useState<string>('');
  const [secondaryCoord, setSecondaryCoord] = useState<string>('');
  const [hoveredCard, setHoveredCard] = useState<CardDefinition | null>(null);
  const [loading, setLoading] = useState(false);

  const playerColorMap = useMemo(() => {
    const map: Record<string, (typeof PLAYER_COLORS)[0]> = {};
    if (!game) return map;
    Object.keys(game.players_public).forEach((pid, idx) => {
      map[pid] = PLAYER_COLORS[idx % PLAYER_COLORS.length];
    });
    return map;
  }, [game]);

  const myPlayer = game ? game.players_public[playerId] : null;
  const myColor = playerColorMap[playerId] || PLAYER_COLORS[0];
  const myControlledTilesCount = useMemo(
    () => (game ? game.board_tiles.filter((t) => t.ownerId === playerId).length : 0),
    [game, playerId]
  );

  async function handleStartGame() {
    setLoading(true);
    try {
      const res = await fetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerCount,
          playerName: 'Architecte',
          enableCapriceR3: enableCaprice,
        }),
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
        setGame(g);
        setMyHandIds(Object.keys(data.catalog).slice(0, 12));
        setMyReserveIds([]);
        setLogs(['🎲 Plateau mis en place. Choisissez 2 cartes de votre éventail.']);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleCardAction(
    card: CardDefinition,
    fromReserve: boolean,
    mode: 'PLAY' | 'RESERVE' | 'DISCARD'
  ) {
    if (!fromReserve && pickedIds.includes(card.id)) {
      setPickedIds(pickedIds.filter((id) => id !== card.id));
      setCommands(commands.filter((c) => c.cardId !== card.id));
      return;
    }

    if (!fromReserve) {
      if (pickedIds.length >= 2) {
        alert('Vous avez déjà choisi 2 cartes de votre main (cliquez sur une carte choisie pour la retirer).');
        return;
      }
      if (
        mode === 'DISCARD' &&
        commands.some((c) => c.actionType === 'DISCARD_FOR_DRACHMAS')
      ) {
        alert('Maximum 1 carte défaussée contre des Drachmes par tour.');
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

    const target = card.targetCoord || primaryCoord || undefined;
    if (actionType === 'BUILD_ON_TILE' && !target) {
      alert('Cliquez d’abord sur une case 3D du plateau pour cibler où construire !');
      return;
    }

    setCommands((prev) => [
      ...prev.filter((c) => c.cardId !== card.id),
      {
        cardId: card.id,
        source: fromReserve ? 'RESERVE' : 'HAND',
        actionType,
        targetCoord: target,
      },
    ]);
  }

  function handleClaimMajorGod(godId: MajorGodId) {
    if (!primaryCoord || !secondaryCoord) {
      alert('Sélectionnez la Case 1 (clic gauche) et la Case 2 (clic droit) sur le plateau 3D.');
      return;
    }
    setCommands((prev) => [
      ...prev.filter((c) => c.cardId !== godId),
      {
        cardId: godId,
        source: 'MAJOR_GOD',
        actionType: 'CLAIM_MAJOR_GOD',
        targetCoord: primaryCoord,
        secondaryTargetCoord: secondaryCoord,
      },
    ]);
  }

  async function handleValidateTurn() {
    if (!game || pickedIds.length !== 2) return;
    setLoading(true);
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
        setMyHandIds(data.myHand);
        setMyReserveIds(data.myReserve);
        setLogs((prev) => [...data.events, ...prev]);
        setPickedIds([]);
        setCommands([]);
      }
    } finally {
      setLoading(false);
    }
  }

  // ÉCRAN DE CONFIGURATION DU SALON
  if (!game) {
    return (
      <main className="h-screen w-screen tabletop-surface flex items-center justify-center p-6">
        <Card className="boardgame-panel max-w-md w-full p-8 rounded-2xl space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-3xl font-black tracking-wider text-[#684C26]">🏛️ OLYMPUS</h1>
            <p className="text-sm text-[#463217]/80">
              Édition Jeu de Plateau 3D — Draft & Cités Mythologiques
            </p>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <label className="block font-bold mb-1.5 text-[#463217]">Configuration de la Table</label>
              <select
                value={playerCount}
                onChange={(e) => setPlayerCount(Number(e.target.value) as 2 | 3 | 4)}
                className="w-full rounded-lg border-2 border-[#684C26] bg-[#F6F5DF] p-2.5 font-semibold text-[#463217]"
              >
                <option value={2}>2 Joueurs — 40 Tuiles, 72 Cartes (Zeus)</option>
                <option value={3}>3 Joueurs — 55 Tuiles, 108 Cartes (Zeus, Poséidon)</option>
                <option value={4}>4 Joueurs — 70 Tuiles, 144 Cartes (Zeus, Poséidon, Hadès)</option>
              </select>
            </div>

            <label className="flex items-center gap-2.5 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={enableCaprice}
                onChange={(e) => setEnableCaprice(e.target.checked)}
                className="h-4 w-4 accent-[#684C26]"
              />
              Activer le « Caprice des Dieux » à la Manche 3
            </label>

            <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer text-[#684C26]">
              <input
                type="checkbox"
                checked={useGltfAssets}
                onChange={(e) => setUseGltfAssets(e.target.checked)}
                className="h-4 w-4 accent-[#684C26]"
              />
              Charger les fichiers .gltf KayKit depuis /public/assets/gltf/
            </label>
          </div>

          <Button
            onClick={handleStartGame}
            disabled={loading}
            className="w-full bg-[#684C26] hover:bg-[#463217] text-[#F6F5DF] font-bold py-6 text-base rounded-xl cursor-pointer"
          >
            {loading ? 'Mise en place du plateau 3D...' : 'Installer le Plateau de Jeu'}
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <div className="h-screen w-screen tabletop-surface relative overflow-hidden flex flex-col justify-between">
      {/* 1. HAUT DE LA TABLE : ADVERSAIRES, TOUR & GRANDS TEMPLES */}
      <header className="z-20 px-6 pt-3 flex justify-between items-start pointer-events-none">
        {/* Indicateur de Manche & Journal compact */}
        <div className="boardgame-panel rounded-xl px-4 py-2.5 pointer-events-auto flex flex-col gap-1 max-w-sm">
          <div className="flex items-center gap-3">
            <span className="text-lg font-black text-[#684C26]">🏛️ OLYMPUS</span>
            <Badge className="bg-[#684C26] text-[#F6F5DF]">
              Manche {game.current_round}/3 • Tour {game.current_turn}/6
            </Badge>
          </div>
          <div className="text-[11px] text-[#463217]/90 truncate">
            {logs[0] || 'Sélectionnez 2 cartes dans votre éventail.'}
          </div>
        </div>

        {/* Cartes des Joueurs autour de la table */}
        <div className="flex gap-3 pointer-events-auto">
          {Object.values(game.players_public).map((p) => {
            const c = playerColorMap[p.id];
            const isMe = p.id === playerId;
            return (
              <div
                key={p.id}
                className={`boardgame-panel rounded-xl px-3.5 py-2 flex items-center gap-3 ${
                  isMe ? 'ring-2 ring-amber-500' : ''
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white shadow"
                  style={{ backgroundColor: c?.hex }}
                />
                <div className="text-xs">
                  <div className="font-bold text-[#463217]">
                    {p.name} {isMe && '(Vous)'}
                  </div>
                  <div className="flex gap-2 text-[11px] font-semibold text-[#684C26]">
                    <span>🪙 {p.drachmas}</span>
                    <span>⚡ {p.olympusFavor} Fav.</span>
                    <span>🏗️ {p.reserveCount}</span>
                  </div>
                </div>
                <div className="pl-2 border-l border-[#684C26]/30 text-right">
                  <div className="text-[9px] uppercase font-bold text-[#684C26]">Gloire</div>
                  <div className="text-sm font-black text-[#463217]">{p.totalScore} PV</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Les 3 Grands Temples sur le bord du plateau */}
        <div className="boardgame-panel rounded-xl p-2.5 pointer-events-auto flex gap-2">
          {(['ZEUS', 'POSEIDON', 'HADES'] as MajorGodId[]).map((gId) => {
            if (gId === 'POSEIDON' && game.player_count < 3) return null;
            if (gId === 'HADES' && game.player_count < 4) return null;
            const st = game.major_gods_state[gId];
            const def = MAJOR_GODS_CATALOG[gId];
            return (
              <div
                key={gId}
                className="bg-[#F6F5DF] border border-[#684C26]/50 rounded-lg p-2 w-40 text-[11px] flex flex-col justify-between"
              >
                <div>
                  <div className="font-extrabold text-[#684C26] truncate">{def.name}</div>
                  <div className="text-[10px] text-[#463217]/80 line-clamp-2">{def.description}</div>
                </div>
                {st.available ? (
                  <button
                    onClick={() => handleClaimMajorGod(gId)}
                    className="mt-1.5 w-full bg-[#684C26] hover:bg-[#463217] text-[#F6F5DF] font-bold py-1 rounded text-[10px] cursor-pointer"
                  >
                    Ériger [{primaryCoord || '?'}]+[{secondaryCoord || '?'}]
                  </button>
                ) : (
                  <span className="mt-1 text-[10px] font-bold text-amber-800">⚡ Déjà Bâti</span>
                )}
              </div>
            );
          })}
        </div>
      </header>

      {/* 2. CENTRE : PLATEAU 3D PLEIN ÉCRAN AVEC RELIEF DES MONTAGNES */}
      <div className="absolute inset-0 z-0">
        <OlympusBoard3D
          tiles={game.board_tiles}
          playerColorMap={playerColorMap}
          primaryCoord={primaryCoord}
          secondaryCoord={secondaryCoord}
          hoveredCoord={hoveredCard?.targetCoord}
          useGltfAssets={useGltfAssets}
          onSelectPrimary={setPrimaryCoord}
          onSelectSecondary={setSecondaryCoord}
        />
      </div>

      {/* 3. BAS DE LA TABLE : PIÈCES & PIONS 3D (GAUCHE) + DECK EN ÉVENTAIL (CENTRE) + CARTES GARDÉES (DROITE) */}
      <footer className="z-20 px-6 pb-3 flex items-end justify-between pointer-events-none">
        {/* GAUCHE DU DECK : BOURSE DE PIÈCES (DRACHMES) + PIONS 3D DU JOUEUR */}
        <div className="boardgame-panel rounded-2xl p-3.5 pointer-events-auto flex items-center gap-4 w-80">
          {/* Aperçu 3D en temps réel de votre Pion de Citoyen */}
          <div className="w-20 h-24 bg-[#e8e5c3] rounded-xl border border-[#684C26]/40 relative overflow-hidden shrink-0">
            <Canvas shadows camera={{ position: [0, 1.1, 1.8], fov: 38 }}>
              <ambientLight intensity={0.8} />
              <directionalLight position={[3, 5, 3]} intensity={1.2} />
              <Pawn3D colorHex={myColor.hex} position={[0, -0.32, 0]} scale={1.1} />
            </Canvas>
            <span className="absolute bottom-1 inset-x-0 text-center text-[9px] font-extrabold text-[#463217]">
              {myControlledTilesCount} Pions posés
            </span>
          </div>

          {/* Pièces d'or (Drachmes) & Faveur Divine */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2.5">
              <div className="drachma-coin flex items-center justify-center font-black text-xs text-[#463217]">
                🪙
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-[#684C26]">Trésorerie</div>
                <div className="text-lg font-black text-[#463217]">
                  {myPlayer?.drachmas ?? 10} Drachmes
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs bg-[#e8e5c3] px-2.5 py-1 rounded-lg border border-[#684C26]/30">
              <span className="font-bold text-[#684C26]">⚡ Faveur Divine :</span>
              <span className="font-black text-amber-700">{myPlayer?.olympusFavor ?? 0}</span>
            </div>

            <div className="text-[10px] font-semibold text-[#684C26]">
              🎯 Case cible : <strong>{primaryCoord || 'Cliquez sur une tuile'}</strong>
            </div>
          </div>
        </div>

        {/* CENTRE : MAIN DE CARTES EN ÉVENTAIL (DECK COURBÉ) */}
        <div className="card-fan-wrapper pointer-events-auto flex flex-col items-center">
          <div className="flex items-center justify-center h-56 px-8">
            {myHandIds.map((cid, index) => {
              const card = catalog[cid];
              if (!card) return null;
              const total = myHandIds.length;
              const middle = (total - 1) / 2;
              const offset = index - middle;
              const rotateDeg = offset * 4.2;
              const translateY = Math.abs(offset) * 5;
              const isPicked = pickedIds.includes(cid);
              const badge = CATEGORY_BADGES[card.category] || CATEGORY_BADGES.BUILDING;

              return (
                <div
                  key={cid}
                  onMouseEnter={() => setHoveredCard(card)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    transform: `translateY(${ isPicked ? -28 : translateY }px) rotate(${rotateDeg}deg)`,
                    marginLeft: index === 0 ? 0 : '-52px',
                    zIndex: isPicked ? 40 : index + 1,
                  }}
                  className={`playing-card p-2.5 flex flex-col justify-between ${
                    isPicked ? 'is-picked' : ''
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${badge.bg}`}>
                        {badge.label}
                      </span>
                      {card.power > 0 && (
                        <span className="text-[10px] font-black text-[#684C26]">
                          +{card.power}P
                        </span>
                      )}
                    </div>
                    <div className="font-extrabold text-xs text-[#463217] leading-tight mb-1">
                      {card.name}
                    </div>
                    <p className="text-[10px] text-[#463217]/85 leading-snug line-clamp-3">
                      {card.description}
                    </p>
                  </div>

                  {/* Boutons d'action de la carte */}
                  <div className="space-y-1 pt-1.5 border-t border-[#684C26]/25">
                    <div className="text-[9px] font-bold text-[#684C26] truncate">
                      Coût :{' '}
                      {Object.keys(card.cost).length > 0
                        ? Object.entries(card.cost)
                            .map(([k, v]) => `${v} ${k}`)
                            .join(', ')
                        : 'Gratuit'}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleCardAction(card, false, 'PLAY')}
                        className="flex-1 bg-[#684C26] hover:bg-[#463217] text-[#F6F5DF] font-bold py-1 rounded text-[10px] cursor-pointer"
                      >
                        {card.targetCoord ? `Poser ${card.targetCoord}` : 'Jouer'}
                      </button>
                      {(card.category === 'BUILDING' ||
                        card.category === 'SECONDARY_GOD' ||
                        card.category === 'SPECIAL_RESOURCE' ||
                        card.category === 'INHABITANT') && (
                        <button
                          onClick={() => handleCardAction(card, false, 'RESERVE')}
                          className="bg-[#e8e5c3] hover:bg-[#d8d3a8] text-[#463217] border border-[#684C26] font-bold px-1.5 py-1 rounded text-[9px] cursor-pointer"
                        >
                          Garder
                        </button>
                      )}
                      <button
                        onClick={() => handleCardAction(card, false, 'DISCARD')}
                        className="bg-amber-200 hover:bg-amber-300 text-[#463217] font-bold px-1.5 py-1 rounded text-[9px] cursor-pointer"
                      >
                        +3🪙
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* DROITE DU DECK : CARTES GARDÉES (CHANTIER) + VALIDATION DU TOUR */}
        <div className="boardgame-panel rounded-2xl p-3.5 pointer-events-auto w-80 flex flex-col gap-2.5">
          <div className="flex justify-between items-center border-b border-[#684C26]/25 pb-1">
            <span className="text-xs font-extrabold uppercase text-[#684C26]">
              🏗️ Cartes Gardées ({myReserveIds.length})
            </span>
            <span className="text-[10px] font-bold text-amber-800">5🪙 fin Tour 6</span>
          </div>

          <div className="flex gap-1.5 overflow-x-auto min-h-[68px] items-center">
            {myReserveIds.length === 0 ? (
              <span className="text-[11px] italic text-[#684C26]/75">
                Aucune carte gardée sur votre tapis.
              </span>
            ) : (
              myReserveIds.map((cid) => {
                const c = catalog[cid];
                if (!c) return null;
                return (
                  <div
                    key={cid}
                    className="bg-[#F6F5DF] border border-[#684C26] rounded-lg p-1.5 min-w-[115px] text-[10px] flex flex-col justify-between"
                  >
                    <div className="font-bold truncate text-[#463217]">{c.name}</div>
                    <button
                      onClick={() => handleCardAction(c, true, 'PLAY')}
                      className="mt-1 bg-[#684C26] text-[#F6F5DF] font-bold py-0.5 rounded text-[9px] cursor-pointer"
                    >
                      Bâtir [{primaryCoord || '?'}]
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPickedIds([]);
                setCommands([]);
              }}
              disabled={pickedIds.length === 0}
              className="border-[#684C26] text-[#684C26] text-xs cursor-pointer"
            >
              Annuler ({pickedIds.length}/2)
            </Button>
            <Button
              size="sm"
              onClick={handleValidateTurn}
              disabled={pickedIds.length !== 2 || loading}
              className="flex-1 bg-[#684C26] hover:bg-[#463217] text-[#F6F5DF] font-black text-xs cursor-pointer"
            >
              {loading ? 'Résolution...' : 'Valider mes 2 Cartes'}
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
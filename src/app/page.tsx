// src/app/page.tsx
'use client';

import React, { useState, useMemo } from 'react';
import {
  CardDefinition,
  GamePublicState,
  MajorGodId,
  ResourceType,
  TurnActionCommand,
} from '@/core/types/game.types';
import { MAJOR_GODS_CATALOG } from '@/core/data/cards.catalog';
import { PLAYER_COLORS } from '@/core/data/kaykit.mapper';
import OlympusBoard3D from '@/components/board/OlympusBoard3D';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const CARD_THEMES: Record<string, { headerBg: string; border: string; label: string }> = {
  TERRITORY: { headerBg: 'bg-emerald-800 text-emerald-100', border: 'border-emerald-600', label: 'Territoire' },
  BUILDING: { headerBg: 'bg-blue-800 text-blue-100', border: 'border-blue-600', label: 'Bâtiment Civil' },
  SECONDARY_GOD: { headerBg: 'bg-purple-900 text-amber-300 border-b border-amber-400', border: 'border-purple-600', label: 'Dieu Secondaire' },
  SPECIAL_RESOURCE: { headerBg: 'bg-amber-950 text-amber-200', border: 'border-amber-800', label: 'Ressource Temporaire' },
  INHABITANT: { headerBg: 'bg-yellow-950 text-yellow-200', border: 'border-yellow-700', label: 'Habitant / Fin de Manche' },
  BONUS: { headerBg: 'bg-slate-800 text-slate-100', border: 'border-slate-500', label: 'Bénédiction' },
  MALUS: { headerBg: 'bg-rose-950 text-rose-200', border: 'border-rose-700', label: 'Colère Divine' },
};

export default function OlympusGamePage() {
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(2);
  const [game, setGame] = useState<GamePublicState | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [catalog, setCatalog] = useState<Record<string, CardDefinition>>({});
  const [myHandIds, setMyHandIds] = useState<string[]>([]);
  const [myReserveIds, setMyReserveIds] = useState<string[]>([]);
  const [playedCardsIds, setPlayedCardsIds] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  // ÉTAT DU TOUR & FLUX « CARTE D'ABORD »
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [commands, setCommands] = useState<TurnActionCommand[]>([]);
  const [activeCardToPlace, setActiveCardToPlace] = useState<CardDefinition | null>(null);
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

  // Calcul des ressources permanentes actuellement produites par le joueur
  const myResources = useMemo(() => {
    if (!game || !playerId) return {};
    const res: Partial<Record<ResourceType, number>> = { WHEAT: 0, WOOD: 0, CLAY: 0, MARBLE: 0, BRONZE: 0, FISH: 0 };
    game.board_tiles.filter((t) => t.ownerId === playerId).forEach((t) => {
      if (t.terrain === 'PLAINS') res.WHEAT = (res.WHEAT || 0) + 1;
      if (t.terrain === 'FOREST') res.WOOD = (res.WOOD || 0) + 1;
      if (t.terrain === 'RIVER') res.CLAY = (res.CLAY || 0) + 1;
      if (t.terrain === 'MOUNTAIN_MARBLE') res.MARBLE = (res.MARBLE || 0) + 1;
      if (t.terrain === 'MOUNTAIN_BRONZE') res.BRONZE = (res.BRONZE || 0) + 1;
      if (t.terrain === 'SEA') res.FISH = (res.FISH || 0) + 1;
    });
    return res;
  }, [game, playerId]);

  // Hexagones compatibles illuminés sur le plateau 3D lors du ciblage
  const validTargetCoords = useMemo(() => {
    if (!game || !activeCardToPlace) return [];
    return game.board_tiles
      .filter((t) => {
        if (t.ownerId !== playerId) return false;
        if (t.building) return false;
        if (activeCardToPlace.allowedTerrains && !activeCardToPlace.allowedTerrains.includes(t.terrain)) return false;
        return true;
      })
      .map((t) => t.coord);
  }, [game, activeCardToPlace, playerId]);

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
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        const { data: g } = await supabase.from('games').select('*').eq('id', data.gameId).single();
        if (g) setGame(g);

        // CORRECTION : charge la vraie main de 12 cartes aléatoires reçue de l'API
        setMyHandIds(data.myHand || []);
        setMyReserveIds([]);
        setPlayedCardsIds([]);
        setLogs(['🎲 Plateau de 100 hexagones prêt. Cliquez sur une carte pour la jouer.']);
      }
    } finally {
      setLoading(false);
    }
  }

  // 1. DÉCLENCHEMENT DE L'ACTION LORS DU CLIC SUR LA CARTE
  function handleCardClick(card: CardDefinition, fromReserve: boolean) {
    if (!fromReserve && pickedIds.includes(card.id)) {
      setPickedIds(pickedIds.filter((id) => id !== card.id));
      setCommands(commands.filter((c) => c.cardId !== card.id));
      setActiveCardToPlace(null);
      return;
    }

    if (!fromReserve && pickedIds.length >= 2) {
      alert('Vous avez déjà sélectionné 2 cartes pour ce tour.');
      return;
    }

    // A. TERRITOIRE : La cible est la coordonnée de la carte
    if (card.category === 'TERRITORY' && card.targetCoord) {
      if (!fromReserve) setPickedIds([...pickedIds, card.id]);
      setCommands((prev) => [
        ...prev.filter((c) => c.cardId !== card.id),
        { cardId: card.id, source: fromReserve ? 'RESERVE' : 'HAND', actionType: 'CLAIM_TERRITORY', targetCoord: card.targetCoord },
      ]);
      setLogs((prev) => [`🎯 Carte ${card.name} : Pion assigné sur la case ${card.targetCoord}.`, ...prev]);
      return;
    }

    // B. HABITANT, BONUS, MALUS : Pas besoin de cliquer sur le plateau
    if (card.category === 'INHABITANT' || card.category === 'BONUS' || card.category === 'MALUS') {
      if (!fromReserve) setPickedIds([...pickedIds, card.id]);
      const act = card.category === 'INHABITANT' ? 'PLAY_INHABITANT' : card.category === 'BONUS' ? 'PLAY_BONUS' : 'PLAY_MALUS';
      setCommands((prev) => [
        ...prev.filter((c) => c.cardId !== card.id),
        { cardId: card.id, source: fromReserve ? 'RESERVE' : 'HAND', actionType: act },
      ]);
      return;
    }

    // C. BÂTIMENT, DIEU SECONDAIRE, RESSOURCE MARRON : Entrer en mode ciblage sur le plateau 3D
    setActiveCardToPlace(card);
  }

  // 2. SÉLECTION DE LA CASE COMPATIBLE SUR LE PLATEAU 3D APRÈS AVOIR CLIQUÉ LA CARTE
  function handleTileSelect(coord: string) {
    if (!activeCardToPlace) return;

    if (!validTargetCoords.includes(coord)) {
      alert(`La case ${coord} n'est pas éligible pour ${activeCardToPlace.name} (doit vous appartenir et être libre).`);
      return;
    }

    const card = activeCardToPlace;
    const fromReserve = myReserveIds.includes(card.id);

    if (!fromReserve && !pickedIds.includes(card.id)) {
      setPickedIds([...pickedIds, card.id]);
    }

    setCommands((prev) => [
      ...prev.filter((c) => c.cardId !== card.id),
      { cardId: card.id, source: fromReserve ? 'RESERVE' : 'HAND', actionType: 'BUILD_ON_TILE', targetCoord: coord },
    ]);

    setLogs((prev) => [`🏗️ ${card.name} assigné sur la case ${coord}.`, ...prev]);
    setActiveCardToPlace(null);
  }

  function handleMoveToReserve(card: CardDefinition) {
    if (pickedIds.length >= 2 && !pickedIds.includes(card.id)) return;
    if (!pickedIds.includes(card.id)) setPickedIds([...pickedIds, card.id]);
    setCommands((prev) => [
      ...prev.filter((c) => c.cardId !== card.id),
      { cardId: card.id, source: 'HAND', actionType: 'MOVE_TO_RESERVE' },
    ]);
  }

  function handleDiscard(card: CardDefinition) {
    if (pickedIds.length >= 2 && !pickedIds.includes(card.id)) return;
    if (commands.some((c) => c.actionType === 'DISCARD_FOR_DRACHMAS')) {
      alert('Maximum 1 carte défaussée contre des Drachmes par tour.');
      return;
    }
    if (!pickedIds.includes(card.id)) setPickedIds([...pickedIds, card.id]);
    setCommands((prev) => [
      ...prev.filter((c) => c.cardId !== card.id),
      { cardId: card.id, source: 'HAND', actionType: 'DISCARD_FOR_DRACHMAS' },
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
            reserveCleanupDecisions: myReserveIds.map((cid) => ({ cardId: cid, decision: 'KEEP_PAY_DRACHMAS' })),
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
      }
    } finally {
      setLoading(false);
    }
  }

  if (!game) {
    return (
      <main className="h-screen w-screen tabletop-surface flex items-center justify-center p-6">
        <div className="boardgame-panel max-w-md w-full p-8 rounded-2xl space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-3xl font-black text-[#684C26]">🏛️ OLYMPUS</h1>
            <p className="text-sm text-[#463217]/80">Île de 100 Hexagones — 4 Manches</p>
          </div>
          <div>
            <label className="block font-bold mb-1.5 text-[#463217]">Nombre de joueurs :</label>
            <select
              value={playerCount}
              onChange={(e) => setPlayerCount(Number(e.target.value) as 2 | 3 | 4)}
              className="w-full rounded-lg border-2 border-[#684C26] bg-[#F6F5DF] p-2.5 font-semibold text-[#463217]"
            >
              <option value={2}>2 Joueurs (100 Tuiles, 96 Cartes, Zeus)</option>
              <option value={3}>3 Joueurs (100 Tuiles, 144 Cartes, Zeus + Poséidon)</option>
              <option value={4}>4 Joueurs (100 Tuiles, 192 Cartes, Zeus + Poséidon + Hadès)</option>
            </select>
          </div>
          <Button onClick={handleStartGame} disabled={loading} className="w-full bg-[#684C26] hover:bg-[#463217] text-[#F6F5DF] font-bold py-6 text-base rounded-xl cursor-pointer">
            {loading ? 'Génération de l’Île...' : 'Installer la Table'}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <div className="h-screen w-screen tabletop-surface relative overflow-hidden flex flex-col justify-between select-none">
      {/* 1. HUD EN HAUT : JOUEURS & BANDEAU DE CIBLAGE */}
      <header className="z-20 px-6 pt-3 flex justify-between items-start pointer-events-none">
        <div className="boardgame-panel rounded-xl px-4 py-2 pointer-events-auto flex items-center gap-3">
          <span className="text-base font-black text-[#684C26]">🏛️ OLYMPUS</span>
          <Badge className="bg-[#684C26] text-[#F6F5DF]">Manche {game.current_round}/4 • Tour {game.current_turn}/6</Badge>
          <span className="text-xs text-[#463217] font-semibold border-l border-[#684C26]/30 pl-2">
            {activeCardToPlace ? (
              <span className="text-emerald-800 font-extrabold animate-pulse">
                👉 Cliquez sur une case illuminée en vert pour bâtir {activeCardToPlace.name}
              </span>
            ) : (
              logs[0] || 'Sélectionnez 2 cartes.'
            )}
          </span>
        </div>

        {/* Joueurs de la table */}
        <div className="flex gap-2.5 pointer-events-auto">
          {Object.values(game.players_public).map((p) => {
            const isMe = p.id === playerId;
            const c = playerColorMap[p.id];
            return (
              <div key={p.id} className={`boardgame-panel rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs ${isMe ? 'ring-2 ring-amber-500' : ''}`}>
                <span className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: c?.hex }} />
                <div>
                  <div className="font-bold text-[#463217]">{p.name} {isMe && '(Vous)'}</div>
                  <div className="text-[10px] text-[#684C26] font-semibold">🪙 {p.drachmas} | ⚡ {p.olympusFavor} Fav. | 🏆 {p.totalScore} PV</div>
                </div>
              </div>
            );
          })}
        </div>
      </header>

      {/* 2. CENTRE : PLATEAU 3D DE 100 HEXAGONES */}
      <div className="absolute inset-0 z-0">
        <OlympusBoard3D
          tiles={game.board_tiles}
          playerColorMap={playerColorMap}
          primaryCoord=""
          secondaryCoord=""
          hoveredCoord={hoveredCard?.targetCoord}
          validTargetCoords={validTargetCoords}
          isTargetingMode={activeCardToPlace !== null}
          onSelectPrimary={handleTileSelect}
          onSelectSecondary={() => {}}
        />
      </div>

      {/* 3. BAS DE LA TABLE : PRODUCTION (GAUCHE) + MAIN (CENTRE) + LES 3 TAS (DROITE) */}
      <footer className="z-20 px-6 pb-3 flex items-end justify-between pointer-events-none gap-4">
        {/* GAUCHE : BOURSE ET PRODUCTION PERMANENTE DU JOUEUR */}
        <div className="boardgame-panel rounded-2xl p-3 pointer-events-auto w-72 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="drachma-coin flex items-center justify-center font-black text-sm text-[#463217]">🪙</div>
            <div>
              <div className="text-[10px] font-bold uppercase text-[#684C26]">Trésor & Faveur</div>
              <div className="text-base font-black text-[#463217]">{myPlayer?.drachmas ?? 10} Drachmes | ⚡ {myPlayer?.olympusFavor ?? 0} Fav.</div>
            </div>
          </div>
          {/* Production permanente actuelle */}
          <div className="border-t border-[#684C26]/20 pt-1.5">
            <div className="text-[10px] font-bold text-[#684C26] uppercase mb-1">Production permanente de vos cases :</div>
            <div className="grid grid-cols-3 gap-1 text-[11px] font-bold text-[#463217] bg-[#e8e5c3] p-1.5 rounded-lg">
              <span>🌾 {myResources.WHEAT || 0} Blé</span>
              <span>🪵 {myResources.WOOD || 0} Bois</span>
              <span>🏺 {myResources.CLAY || 0} Argile</span>
              <span>🏛️ {myResources.MARBLE || 0} Marbre</span>
              <span>🛡️ {myResources.BRONZE || 0} Bronze</span>
              <span>🐟 {myResources.FISH || 0} Poisson</span>
            </div>
          </div>
        </div>

        {/* CENTRE : ÉVENTAIL DE DRAFT RESSERRÉ (CARTES DISTINCTES) */}
        <div className="card-fan-wrapper pointer-events-auto flex flex-col items-center">
          <div className="flex items-center justify-center h-60 px-4">
            {myHandIds.map((cid, index) => {
              const card = catalog[cid];
              if (!card) return null;
              const isPicked = pickedIds.includes(cid);
              const theme = CARD_THEMES[card.category] || CARD_THEMES.BUILDING;
              const total = myHandIds.length;
              const offset = index - (total - 1) / 2;

              return (
                <div
                  key={cid}
                  onMouseEnter={() => setHoveredCard(card)}
                  onMouseLeave={() => setHoveredCard(null)}
                  onClick={() => handleCardClick(card, false)}
                  style={{
                    transform: `translateY(${isPicked ? -32 : Math.abs(offset) * 4}px) rotate(${offset * 3.5}deg)`,
                    marginLeft: index === 0 ? 0 : '-56px',
                    zIndex: isPicked ? 40 : index + 1,
                  }}
                  className={`playing-card border-2 ${theme.border} flex flex-col justify-between overflow-hidden ${isPicked ? 'is-picked ring-4 ring-amber-500' : ''}`}
                >
                  {/* En-tête coloré distinctif */}
                  <div className={`p-1.5 text-center ${theme.headerBg}`}>
                    <div className="text-[9px] font-extrabold uppercase tracking-wide">{theme.label}</div>
                    <div className="font-extrabold text-[12px] truncate">{card.name}</div>
                  </div>

                  {/* Corps de la carte */}
                  <div className="p-2 flex-1 flex flex-col justify-between text-[10px] text-[#463217]">
                    <p className="line-clamp-3 leading-snug">{card.description}</p>
                    {card.bonusText && <div className="text-[9px] text-emerald-800 font-bold">+ {card.bonusText}</div>}
                    {card.malusText && <div className="text-[9px] text-rose-800 font-bold">- {card.malusText}</div>}
                  </div>

                  {/* Coût en ressources affiché */}
                  <div className="p-1.5 bg-[#e8e5c3]/80 border-t border-[#684C26]/20 text-[9px] font-bold text-[#684C26]">
                    <div>Coût : {Object.entries(card.cost).map(([k, v]) => `${v} ${k}`).join(', ') || 'Gratuit'}</div>
                    <div className="flex gap-1 mt-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCardClick(card, false); }}
                        className="flex-1 bg-[#684C26] text-[#F6F5DF] font-bold py-0.5 rounded text-[9px] cursor-pointer"
                      >
                        {card.category === 'TERRITORY' ? 'Poser' : 'Choisir'}
                      </button>
                      {(card.category === 'BUILDING' || card.category === 'SECONDARY_GOD' || card.category === 'SPECIAL_RESOURCE') && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMoveToReserve(card); }}
                          className="bg-amber-100 border border-[#684C26] text-[#684C26] px-1 py-0.5 rounded text-[8px] cursor-pointer"
                        >
                          Chantier
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDiscard(card); }}
                        className="bg-amber-200 text-[#463217] px-1 py-0.5 rounded text-[8px] cursor-pointer"
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

        {/* DROITE : LES 3 TAS (CHANTIER, PASSIFS, CARTES JOUÉES) */}
        <div className="boardgame-panel rounded-2xl p-3 pointer-events-auto w-80 space-y-2.5">
          {/* TAS 1 : EN ATTENTE / CHANTIER */}
          <div className="bg-[#e8e5c3] p-2 rounded-xl border border-[#684C26]/20">
            <div className="flex justify-between items-center text-[10px] font-black text-[#684C26] uppercase">
              <span>🏗️ 1. En Attente / Chantier ({myReserveIds.length})</span>
              <span className="text-amber-800 font-bold">5🪙 fin T6</span>
            </div>
            <div className="flex gap-1 mt-1 overflow-x-auto min-h-[38px] items-center">
              {myReserveIds.length === 0 ? (
                <span className="text-[10px] italic text-[#684C26]/70">Aucune carte en attente.</span>
              ) : (
                myReserveIds.map((cid) => (
                  <button
                    key={cid}
                    onClick={() => handleCardClick(catalog[cid], true)}
                    className="bg-[#F6F5DF] border border-[#684C26] rounded px-1.5 py-0.5 text-[9px] font-bold text-[#463217] shrink-0 hover:bg-amber-100 cursor-pointer"
                  >
                    Bâtir {catalog[cid]?.name.slice(0, 10)}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* TAS 2 : FIN DE MANCHE & PASSIFS (HABITANTS, DIEUX) */}
          <div className="bg-[#e8e5c3] p-2 rounded-xl border border-[#684C26]/20">
            <div className="text-[10px] font-black text-[#684C26] uppercase mb-1">
              🏆 2. Fin de Manche & Passifs ({myPlayer?.inhabitants.length || 0})
            </div>
            <div className="text-[10px] text-[#463217] space-y-0.5">
              {myPlayer?.inhabitants.length === 0 ? (
                <span className="italic text-[#684C26]/70">Aucun passif pour le moment.</span>
              ) : (
                myPlayer?.inhabitants.map((inhId) => (
                  <div key={inhId} className="truncate">• {catalog[inhId]?.name || inhId}</div>
                ))
              )}
            </div>
          </div>

          {/* TAS 3 : CARTES DÉJÀ JOUÉES (DÉFAUSSES & POSES) */}
          <div className="flex justify-between items-center bg-[#F6F5DF] p-2 rounded-xl border border-[#684C26]/30 text-xs">
            <span className="font-bold text-[#684C26]">📦 3. Cartes Jouées :</span>
            <Badge variant="outline" className="border-[#684C26] text-[#684C26] font-black">{playedCardsIds.length}</Badge>
          </div>

          {/* BOUTON DE VALIDATION DU TOUR */}
          <div className="flex gap-2 pt-1 border-t border-[#684C26]/20">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setPickedIds([]); setCommands([]); setActiveCardToPlace(null); }}
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
              {loading ? 'Résolution...' : 'Valider mon Tour'}
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
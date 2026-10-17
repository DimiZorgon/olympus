'use client';

import React from 'react';
import { GamePublicState } from '@/core/types/game.types';
import { CAPRICES_CATALOG } from '@/core/data/cards.catalog';

interface GameHudProps {
  game: GamePublicState;
  currentPlayerId: string;
  onToggleAfk: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({ game, currentPlayerId, onToggleAfk }) => {
  const activeCaprice = game.active_caprice_id
    ? CAPRICES_CATALOG.find((c) => c.id === game.active_caprice_id)
    : null;

  return (
    <div className="border rounded-xl p-3 bg-white shadow-sm space-y-3">
      <div className="flex flex-wrap justify-between items-center gap-2 border-b pb-2">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase font-extrabold tracking-wider bg-slate-900 text-amber-300 px-3 py-1 rounded-md">
            OLYMPUS
          </span>
          <span className="text-sm font-bold text-slate-800">
            Manche {game.current_round} / 3 — Tour {game.current_turn} / 6
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
            Salon : {game.room_code}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {activeCaprice && (
            <span className="text-xs font-semibold bg-purple-100 text-purple-900 border border-purple-300 px-2.5 py-1 rounded-lg">
              ⚡ Caprice : {activeCaprice.name}
            </span>
          )}
          <button
            onClick={onToggleAfk}
            className="text-xs font-medium px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700"
          >
            Laisser l&apos;IA jouer (AFK)
          </button>
        </div>
      </div>

      {/* Cartouches Joueurs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Object.values(game.players_public).map((player, idx) => {
          const isMe = player.id === currentPlayerId;
          return (
            <div
              key={player.id}
              className={`border rounded-lg p-2 flex flex-col justify-between ${
                isMe ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-900 truncate">
                  {player.name} {isMe && '(Vous)'}
                </span>
                {player.isReady ? (
                  <span className="text-[10px] font-bold text-emerald-600">✓ Prêt</span>
                ) : (
                  <span className="text-[10px] font-medium text-amber-600">... En réflexion</span>
                )}
              </div>

              <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-slate-700">
                <span>💰 <strong>{player.drachmas}</strong> Dr.</span>
                <span>⚡ Faveur : <strong>{player.olympusFavor}</strong></span>
                <span>🏛️ Chantier : <strong>{player.reserveCount}</strong></span>
                <span className="text-blue-700 font-bold">🏆 {player.totalScore} PV</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


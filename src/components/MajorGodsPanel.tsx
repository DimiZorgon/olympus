'use client';

import React from 'react';
import { MajorGodDefinition, MajorGodId, MajorGodState, PlayerPublicState } from '@/core/types/game.types';
import { MAJOR_GODS_CATALOG } from '@/core/data/cards.catalog';

interface MajorGodsPanelProps {
  majorGodsState: Record<MajorGodId, MajorGodState>;
  players: Record<string, PlayerPublicState>;
  selectedCoord: string;
  secondaryCoord: string;
  onClaimMajorGod: (godId: MajorGodId) => void;
}

export const MajorGodsPanel: React.FC<MajorGodsPanelProps> = ({
  majorGodsState,
  players,
  selectedCoord,
  secondaryCoord,
  onClaimMajorGod,
}) => {
  const godsList: MajorGodId[] = ['ZEUS', 'POSEIDON', 'HADES'];

  return (
    <div className="border rounded-xl p-4 bg-slate-900 text-slate-100 shadow-sm space-y-3">
      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
        <h3 className="font-bold text-sm tracking-wide text-amber-300 flex items-center gap-2">
          <span>⚡ Grands Temples des Dieux Majeurs (Hors-Draft)</span>
        </h3>
        <span className="text-xs text-slate-400">
          Premier arrivé, premier servi | Priorité à la Faveur Divine en cas d&apos;égalité
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {godsList.map((godId) => {
          const state = majorGodsState[godId];
          const def: MajorGodDefinition = MAJOR_GODS_CATALOG[godId];

          if (!state) return null;

          const isClaimable = state.available;
          const owner = state.ownerId ? players[state.ownerId] : null;

          return (
            <div
              key={godId}
              className={`border rounded-lg p-3 flex flex-col justify-between ${
                isClaimable
                  ? 'border-amber-500/50 bg-slate-800/80'
                  : 'border-slate-800 bg-slate-950/60 opacity-75'
              }`}
            >
              <div className="space-y-1">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-sm text-amber-200">{def.name}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      isClaimable
                        ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-700'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isClaimable ? 'DISPONIBLE' : `Bâti par ${owner?.name || 'Inconnu'}`}
                  </span>
                </div>

                <div className="text-xs text-slate-300">{def.description}</div>

                <div className="text-[11px] text-amber-400/90 font-medium">
                  Coût :{' '}
                  {Object.entries(def.cost)
                    .map(([k, v]) => `${v} ${k}`)
                    .join(', ')}
                </div>

                <div className="text-[10px] text-slate-400">
                  Emplacement requis : 2 cases adjacentes libres.
                </div>
              </div>

              {isClaimable && (
                <button
                  onClick={() => onClaimMajorGod(godId)}
                  disabled={!selectedCoord || !secondaryCoord}
                  className="mt-3 w-full py-1.5 px-2 text-xs font-bold rounded bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-30 disabled:hover:bg-amber-500 transition-colors shadow-sm"
                >
                  Revendiquer sur [{selectedCoord || '?'} + {secondaryCoord || '?'}]
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};


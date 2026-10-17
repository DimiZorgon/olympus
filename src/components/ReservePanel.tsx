'use client';

import React from 'react';
import { CardDefinition } from '@/core/types/game.types';

interface ReservePanelProps {
  reserveCards: CardDefinition[];
  selectedCoord: string;
  onBuildFromReserve: (card: CardDefinition) => void;
  isTour6: boolean;
}

export const ReservePanel: React.FC<ReservePanelProps> = ({
  reserveCards,
  selectedCoord,
  onBuildFromReserve,
  isTour6,
}) => {
  return (
    <div className="border rounded-xl p-3 bg-amber-50/50 border-amber-200 shadow-sm space-y-2">
      <div className="flex justify-between items-center border-b border-amber-200/80 pb-2">
        <h3 className="font-bold text-xs uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
          <span>🏛️ Ma Zone de Chantier ({reserveCards.length} cartes)</span>
        </h3>
        {isTour6 && (
          <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-300">
            ⚠️ Tour 6 : Purge de fin de manche (5 Dr./carte pour conserver)
          </span>
        )}
      </div>

      {reserveCards.length === 0 ? (
        <div className="text-xs text-amber-800/70 italic py-2">
          Aucune carte en Zone de Chantier. Vous pouvez y placer des Bâtiments, Dieux ou Habitants gratuitement pendant le draft.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
          {reserveCards.map((card) => (
            <div
              key={card.id}
              className="border border-amber-300 rounded-lg p-2 bg-white flex flex-col justify-between text-xs space-y-1"
            >
              <div>
                <div className="font-bold text-slate-900">{card.name}</div>
                <div className="text-[10px] text-slate-500">
                  Coût :{' '}
                  {Object.entries(card.cost)
                    .map(([k, v]) => `${v} ${k}`)
                    .join(', ')}
                </div>
                <div className="text-[11px] text-slate-700 line-clamp-2 mt-1">
                  {card.description}
                </div>
              </div>

              <button
                onClick={() => onBuildFromReserve(card)}
                className="mt-2 w-full py-1 px-2 text-[11px] font-bold rounded bg-amber-600 text-white hover:bg-amber-700 transition-colors"
              >
                Construire sur [{selectedCoord || '?'}]
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


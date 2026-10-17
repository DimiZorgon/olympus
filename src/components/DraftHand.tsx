'use client';

import React from 'react';
import { CardCategory, CardDefinition } from '@/core/types/game.types';

interface DraftHandProps {
  handCards: CardDefinition[];
  pickedIds: string[];
  selectedCoord: string;
  onPickCard: (card: CardDefinition, mode: 'PLAY' | 'RESERVE' | 'DISCARD') => void;
  onResetPicks: () => void;
  onSubmitTurn: () => void;
  isSubmitting?: boolean;
}

const CATEGORY_STYLES: Record<
  CardCategory,
  { bg: string; border: string; badge: string; text: string; label: string }
> = {
  TERRITORY: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-500',
    badge: 'bg-emerald-600 text-white',
    text: 'text-emerald-900',
    label: 'Territoire (Vert)',
  },
  BUILDING: {
    bg: 'bg-blue-50',
    border: 'border-blue-500',
    badge: 'bg-blue-600 text-white',
    text: 'text-blue-900',
    label: 'Bâtiment Civil (Bleu)',
  },
  SECONDARY_GOD: {
    bg: 'bg-purple-50',
    border: 'border-purple-600',
    badge: 'bg-purple-700 text-amber-200',
    text: 'text-purple-950',
    label: 'Dieu Secondaire (Or)',
  },
  SPECIAL_RESOURCE: {
    bg: 'bg-amber-50',
    border: 'border-amber-700',
    badge: 'bg-amber-800 text-white',
    text: 'text-amber-950',
    label: 'Ressource Spéciale (Marron)',
  },
  INHABITANT: {
    bg: 'bg-stone-50',
    border: 'border-stone-400',
    badge: 'bg-stone-700 text-stone-100',
    text: 'text-stone-900',
    label: 'Habitant (Ivoire)',
  },
  BONUS: {
    bg: 'bg-slate-50',
    border: 'border-slate-300 shadow-sm',
    badge: 'bg-amber-500 text-white',
    text: 'text-slate-900',
    label: 'Bonus / Bénédiction',
  },
  MALUS: {
    bg: 'bg-rose-50',
    border: 'border-rose-600',
    badge: 'bg-rose-700 text-white',
    text: 'text-rose-950',
    label: 'Malus / Colère',
  },
};

export const DraftHand: React.FC<DraftHandProps> = ({
  handCards,
  pickedIds,
  selectedCoord,
  onPickCard,
  onResetPicks,
  onSubmitTurn,
  isSubmitting = false,
}) => {
  return (
    <div className="border rounded-xl p-4 bg-white shadow-sm space-y-3">
      <div className="flex flex-wrap justify-between items-center gap-2 border-b pb-3">
        <div>
          <h3 className="font-bold text-slate-800 text-base">
            Main de Draft ({handCards.length} cartes)
          </h3>
          <p className="text-xs text-slate-500">
            Sélectionnez <strong>2 cartes</strong> par tour à jouer, réserver ou défausser.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold bg-slate-100 px-3 py-1 rounded-full border">
            Cartes choisies : <strong className="text-blue-600">{pickedIds.length}</strong> / 2
          </span>
          <button
            onClick={onResetPicks}
            disabled={pickedIds.length === 0}
            className="text-xs px-3 py-1.5 border rounded-lg hover:bg-slate-100 disabled:opacity-40"
          >
            Annuler (Undo)
          </button>
          <button
            onClick={onSubmitTurn}
            disabled={pickedIds.length !== 2 || isSubmitting}
            className="text-xs font-bold px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 shadow-sm transition-all"
          >
            {isSubmitting ? 'Résolution...' : 'Valider & Résoudre le Tour'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {handCards.map((card) => {
          const style = CATEGORY_STYLES[card.category] || CATEGORY_STYLES.BUILDING;
          const isPicked = pickedIds.includes(card.id);

          return (
            <div
              key={card.id}
              className={`border-2 rounded-xl p-3 flex flex-col justify-between transition-all ${
                style.bg
              } ${isPicked ? 'ring-2 ring-blue-500 shadow-md scale-[1.01]' : style.border}`}
            >
              <div className="space-y-1.5">
                <div className="flex justify-between items-start gap-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${style.badge}`}>
                    {style.label}
                  </span>
                  {card.power > 0 && (
                    <span className="text-[10px] font-bold bg-amber-400 text-amber-950 px-1.5 py-0.5 rounded">
                      +{card.power} Puiss.
                    </span>
                  )}
                </div>

                <div className="font-bold text-sm text-slate-900 leading-tight">
                  {card.name}
                </div>

                {/* Coût */}
                {Object.keys(card.cost).length > 0 && (
                  <div className="text-[11px] font-medium text-slate-600 bg-white/70 px-2 py-0.5 rounded border border-slate-200">
                    Coût :{' '}
                    {Object.entries(card.cost)
                      .map(([k, v]) => `${v} ${k}`)
                      .join(', ')}
                  </div>
                )}

                <div className="text-xs text-slate-700 leading-relaxed">
                  {card.description}
                </div>

                {card.bonusText && (
                  <div className="text-[11px] text-emerald-800 font-medium">
                    ✨ {card.bonusText}
                  </div>
                )}
                {card.malusText && (
                  <div className="text-[11px] text-rose-800 font-medium">
                    ⚠️ {card.malusText}
                  </div>
                )}
              </div>

              {/* Boutons d'action */}
              <div className="pt-3 border-t border-slate-200/80 flex flex-wrap gap-1">
                <button
                  onClick={() => onPickCard(card, 'PLAY')}
                  className="flex-1 text-[11px] font-semibold py-1 px-2 rounded bg-white hover:bg-slate-100 border text-slate-800"
                >
                  Jouer {card.targetCoord ? `(${card.targetCoord})` : `sur [${selectedCoord || '?'}]`}
                </button>
                {(card.category === 'BUILDING' ||
                  card.category === 'SECONDARY_GOD' ||
                  card.category === 'SPECIAL_RESOURCE' ||
                  card.category === 'INHABITANT') && (
                  <button
                    onClick={() => onPickCard(card, 'RESERVE')}
                    className="text-[11px] font-medium py-1 px-2 rounded bg-white hover:bg-slate-100 border text-amber-900"
                  >
                    Chantier
                  </button>
                )}
                <button
                  onClick={() => onPickCard(card, 'DISCARD')}
                  className="text-[11px] font-medium py-1 px-2 rounded bg-white hover:bg-slate-100 border text-rose-800"
                >
                  +3 Dr.
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


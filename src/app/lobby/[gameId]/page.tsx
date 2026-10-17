'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GamePublicState } from '@/core/types/game.types';

export default function OlympusLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;

  const [game, setGame] = useState<GamePublicState | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchLobby() {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const key =
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
          '';
        if (!url || !key) return;
        const supabase = createClient(url, key);
        const { data } = await supabase.from('games').select('*').eq('id', gameId).single();
        if (data) {
          setGame(data as GamePublicState);
        }
      } catch {
        // Fallback local si en mode offline
      }
    }
    fetchLobby();
  }, [gameId]);

  function copyCode() {
    if (game?.room_code) {
      navigator.clipboard.writeText(game.room_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleStartGame() {
    router.push(`/game/${gameId}`);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 text-slate-100 flex flex-col justify-center items-center p-6">
      <div className="max-w-lg w-full bg-slate-900/90 border border-amber-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs uppercase tracking-widest text-amber-400 font-bold">
            Configuration du Salon
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Salon de l&apos;Olympe
          </h1>
          {game?.room_code && (
            <div className="flex justify-center items-center gap-2 mt-2">
              <span className="text-xs text-slate-400">Code d&apos;invitation :</span>
              <button
                onClick={copyCode}
                className="font-mono text-sm font-bold bg-slate-800 border border-slate-700 hover:border-amber-400 px-3 py-1 rounded-lg text-amber-300 transition-colors"
              >
                {game.room_code} {copied ? '✓ Copié !' : '📋'}
              </button>
            </div>
          )}
        </div>

        {/* Liste des Participants */}
        <div className="space-y-3 border-t border-slate-800 pt-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wide">
            Participants ({game ? Object.keys(game.players_public).length : 2} / {game?.player_count || 2})
          </h2>

          <div className="space-y-2">
            {game
              ? Object.values(game.players_public).map((player) => (
                  <div
                    key={player.id}
                    className="flex justify-between items-center p-3 rounded-xl bg-slate-800/80 border border-slate-700/60"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{player.isBot ? '🤖' : '🏛️'}</span>
                      <span className="font-semibold text-sm text-slate-200">
                        {player.name}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        player.isBot
                          ? 'bg-purple-900/50 text-purple-300 border border-purple-800'
                          : 'bg-emerald-900/50 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {player.isBot ? 'Automate IA' : 'Hôte Humain'}
                    </span>
                  </div>
                ))
              : (
                  <div className="text-xs text-slate-400 italic">
                    Chargement des participants de la salle...
                  </div>
                )}
          </div>
        </div>

        {/* Détails de la partie */}
        {game && (
          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 text-slate-300">
            <div>
              Format : <strong>3 Manches × 6 Tours</strong>
            </div>
            <div>
              Île : <strong>{game.board_tiles.length} Hexagones</strong>
            </div>
            <div>
              Dotation : <strong>10 Drachmes</strong>
            </div>
            <div>
              Caprice M3 :{' '}
              <strong>{game.enable_caprice_r3 ? 'Activé' : 'Désactivé'}</strong>
            </div>
          </div>
        )}

        <button
          onClick={handleStartGame}
          className="w-full py-3 px-4 font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 transition-all shadow-lg text-sm"
        >
          Entrer dans l&apos;Arène (Lancer la Partie)
        </button>
      </div>
    </main>
  );
}


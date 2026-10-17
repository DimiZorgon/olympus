// src/app/api/game/afk/route.ts
import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { computeBotTurnSubmission } from '@/core/bot/OlympusBot';
import { CardDefinition, GamePublicState } from '@/core/types/game.types';
import { PrivatePlayerHandRecord, resolveSimultaneousTurn } from '@/core/engine/TurnResolver';

export async function POST(req: Request) {
  try {
    const { gameId, playerId }: { gameId: string; playerId: string } = await req.json();
    const supabase = createAdminSupabaseClient();

    const { data: gameData, error: gErr } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();
    if (gErr || !gameData) throw new Error('Partie introuvable');

    const game = gameData as GamePublicState;
    if (!game.players_public[playerId]) throw new Error('Joueur introuvable');

    // Passer le joueur en AFK
    game.players_public[playerId].isAfk = true;

    // Récupérer le deck et la main privée du joueur
    const { data: deckRow } = await supabase
      .from('game_decks')
      .select('*')
      .eq('game_id', gameId)
      .single();

    const allCardsMap: Record<string, CardDefinition> = deckRow.round_2_cards.catalog;
    const round2Ids: string[] = deckRow.round_2_cards.cards;
    const round3Ids: string[] = deckRow.round_3_cards;

    const { data: allHandsRows } = await supabase
      .from('player_private_hands')
      .select('*')
      .eq('game_id', gameId);

    const privateHandsMap: Record<string, PrivatePlayerHandRecord> = {};
    for (const row of allHandsRows || []) {
      privateHandsMap[row.player_id] = row;
    }

    // Le Bot calcule le coup pour le joueur AFK
    const botSubmission = computeBotTurnSubmission(
      playerId,
      privateHandsMap[playerId].hand_card_ids,
      privateHandsMap[playerId].reserve_card_ids,
      game,
      allCardsMap
    );

    privateHandsMap[playerId].pending_submission = botSubmission;
    game.players_public[playerId].isReady = true;

    await supabase
      .from('player_private_hands')
      .update({ pending_submission: botSubmission })
      .eq('game_id', gameId)
      .eq('player_id', playerId);

    // Faire jouer également les autres bots si pas encore fait
    for (const pid of Object.keys(game.players_public)) {
      const pState = game.players_public[pid];
      if ((pState.isBot || pState.isAfk) && !privateHandsMap[pid].pending_submission) {
        privateHandsMap[pid].pending_submission = computeBotTurnSubmission(
          pid,
          privateHandsMap[pid].hand_card_ids,
          privateHandsMap[pid].reserve_card_ids,
          game,
          allCardsMap
        );
        pState.isReady = true;
      }
    }

    const allReady = Object.values(game.players_public).every((p) => p.isReady);

    if (!allReady) {
      await supabase
        .from('games')
        .update({ players_public: game.players_public })
        .eq('id', gameId);
      return NextResponse.json({ status: 'AFK_ACTIVATED', game });
    }

    // Si tous sont prêts, résolution immédiate
    const resolution = resolveSimultaneousTurn(game, privateHandsMap, allCardsMap, {
      round2: round2Ids,
      round3: round3Ids,
    });

    await supabase
      .from('games')
      .update({
        status: resolution.updatedGame.status,
        current_round: resolution.updatedGame.current_round,
        current_turn: resolution.updatedGame.current_turn,
        active_caprice_id: resolution.updatedGame.active_caprice_id,
        major_gods_state: resolution.updatedGame.major_gods_state,
        board_tiles: resolution.updatedGame.board_tiles,
        players_public: resolution.updatedGame.players_public,
      })
      .eq('id', gameId);

    for (const pid of Object.keys(resolution.updatedHands)) {
      const h = resolution.updatedHands[pid];
      await supabase
        .from('player_private_hands')
        .update({
          hand_card_ids: h.hand_card_ids,
          reserve_card_ids: h.reserve_card_ids,
          pending_submission: null,
        })
        .eq('game_id', gameId)
        .eq('player_id', pid);
    }

    return NextResponse.json({
      status: 'TURN_RESOLVED',
      game: resolution.updatedGame,
      events: resolution.turnEvents,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur bascule AFK';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


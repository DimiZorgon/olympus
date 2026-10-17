// src/app/api/game/submit-turn/route.ts
import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import {
  PrivatePlayerHandRecord,
  resolveSimultaneousTurn,
} from '@/core/engine/TurnResolver';
import { computeBotTurnSubmission } from '@/core/bot/OlympusBot';
import { computeEndOfRoundHarvest } from '@/core/engine/ScoreCalculator';
import { computePlayerFiefsLiveSummary } from '@/core/map/FiefAnalyzer';
import { CardDefinition, GamePublicState, TurnSubmission } from '@/core/types/game.types';

export async function POST(req: Request) {
  try {
    const { gameId, submission }: { gameId: string; submission: TurnSubmission } =
      await req.json();
    const supabase = createAdminSupabaseClient();

    const { data: gameData, error: gErr } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();
    if (gErr || !gameData) throw new Error('Partie introuvable');

    const game = gameData as GamePublicState;
    const wasTurn6 = game.current_turn === 6;
    const finishedRoundNumber = game.current_round;

    // 1. Enregistrer le coup du joueur humain
    await supabase
      .from('player_private_hands')
      .update({ pending_submission: submission })
      .eq('game_id', gameId)
      .eq('player_id', submission.playerId);

    game.players_public[submission.playerId].isReady = true;

    // 2. Récupérer toutes les mains et le catalogue
    const { data: allHandsRows } = await supabase
      .from('player_private_hands')
      .select('*')
      .eq('game_id', gameId);

    const { data: deckRow } = await supabase
      .from('game_decks')
      .select('*')
      .eq('game_id', gameId)
      .single();

    const allCardsMap: Record<string, CardDefinition> = deckRow.round_2_cards.catalog;
    const round2Ids: string[] = deckRow.round_2_cards.cards;
    const round3Ids: string[] = deckRow.round_3_cards;

    const privateHandsMap: Record<string, PrivatePlayerHandRecord> = {};
    for (const row of allHandsRows || []) {
      privateHandsMap[row.player_id] = row;
    }

    // 3. Faire jouer automatiquement les Bots (et joueurs AFK)
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
      return NextResponse.json({ status: 'WAITING_FOR_OTHERS' });
    }

    // 4. Résoudre le tour simultané
    const resolution = resolveSimultaneousTurn(game, privateHandsMap, allCardsMap, {
      round2: round2Ids,
      round3: round3Ids,
    });

    // 5. Si c'était le Tour 6, construire le récapitulatif détaillé de fin de manche pour la modale UI
    const roundHarvestSummary = wasTurn6
      ? {
          roundNumber: finishedRoundNumber,
          playersBreakdown: Object.values(resolution.updatedGame.players_public).map((p) => {
            const harvest = computeEndOfRoundHarvest(
              resolution.updatedGame.board_tiles,
              p,
              game.active_caprice_id
            );
            const fiefs = computePlayerFiefsLiveSummary(
              resolution.updatedGame.board_tiles,
              p.id
            );
            return {
              playerId: p.id,
              playerName: p.name,
              fiefsCount: fiefs.length,
              fiefsDetails: fiefs.map((f) => ({
                coords: f.tileCoords.join(', '),
                resourcesCount: f.uniqueResources.length,
                power: f.totalPower,
                points: f.harvestScore,
              })),
              roundPoints: harvest.fiefPoints,
              drachmasEarned: harvest.drachmasEarned,
              newTotalScore: p.totalScore,
              newDrachmas: p.drachmas,
              olympusFavor: p.olympusFavor,
            };
          }),
        }
      : null;

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

    await supabase.from('game_turn_logs').insert({
      game_id: gameId,
      round: game.current_round,
      turn: game.current_turn,
      events: resolution.turnEvents,
    });

    return NextResponse.json({
      status: 'TURN_RESOLVED',
      game: resolution.updatedGame,
      myHand: resolution.updatedHands[submission.playerId].hand_card_ids,
      myReserve: resolution.updatedHands[submission.playerId].reserve_card_ids,
      events: resolution.turnEvents,
      roundHarvestSummary,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur résolution du tour';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
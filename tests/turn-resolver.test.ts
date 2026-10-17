import { describe, expect, it } from 'vitest';
import { resolveSimultaneousTurn } from '@/core/engine/TurnResolver';
import { GamePublicState } from '@/core/types/game.types';

describe('TurnResolver — Simultaneous Resolution & Divine Favor V3.0', () => {
  function makeInitialGame(): GamePublicState {
    return {
      id: 'game_test',
      room_code: 'TEST01',
      status: 'IN_PROGRESS',
      player_count: 2,
      current_round: 1,
      current_turn: 1,
      enable_caprice_r3: true,
      active_caprice_id: null,
      major_gods_state: {
        ZEUS: { available: true, ownerId: null, coords: null },
        POSEIDON: { available: false, ownerId: null, coords: null },
        HADES: { available: false, ownerId: null, coords: null },
      },
      board_tiles: [
        {
          coord: 'A1',
          q: 0,
          r: 0,
          terrain: 'MOUNTAIN_MARBLE',
          ownerId: 'p1',
          building: null,
          activeBrownBuffs: [],
        },
        {
          coord: 'A2',
          q: 1,
          r: 0,
          terrain: 'PLAINS',
          ownerId: 'p1',
          building: null,
          activeBrownBuffs: [],
        },
        {
          coord: 'B1',
          q: 0,
          r: 1,
          terrain: 'MOUNTAIN_MARBLE',
          ownerId: 'p2',
          building: null,
          activeBrownBuffs: [],
        },
        {
          coord: 'B2',
          q: 1,
          r: 1,
          terrain: 'PLAINS',
          ownerId: 'p2',
          building: null,
          activeBrownBuffs: [],
        },
      ],
      players_public: {
        p1: {
          id: 'p1',
          name: 'Player 1',
          isBot: false,
          isAfk: false,
          drachmas: 20,
          olympusFavor: 2, // Moins de faveur
          scoreHistory: [],
          totalScore: 0,
          reserveCount: 0,
          inhabitants: [],
          malusesUsedOnMeThisRound: 0,
          isReady: true,
        },
        p2: {
          id: 'p2',
          name: 'Player 2',
          isBot: true,
          isAfk: false,
          drachmas: 20,
          olympusFavor: 5, // Plus de faveur divine
          scoreHistory: [],
          totalScore: 0,
          reserveCount: 0,
          inhabitants: [],
          malusesUsedOnMeThisRound: 0,
          isReady: true,
        },
      },
    };
  }

  it('arbitrates Major God claim in favor of the player with highest Olympus Favor', () => {
    const game = makeInitialGame();

    const privateHands = {
      p1: {
        player_id: 'p1',
        is_bot: false,
        hand_card_ids: ['card_1', 'card_2'],
        reserve_card_ids: [],
        pending_submission: {
          playerId: 'p1',
          pickedFromHand: ['card_1', 'card_2'] as [string, string],
          commands: [
            {
              cardId: 'ZEUS',
              source: 'MAJOR_GOD' as const,
              actionType: 'CLAIM_MAJOR_GOD' as const,
              targetCoord: 'A1',
              secondaryTargetCoord: 'A2',
            },
          ],
        },
      },
      p2: {
        player_id: 'p2',
        is_bot: true,
        hand_card_ids: ['card_3', 'card_4'],
        reserve_card_ids: [],
        pending_submission: {
          playerId: 'p2',
          pickedFromHand: ['card_3', 'card_4'] as [string, string],
          commands: [
            {
              cardId: 'ZEUS',
              source: 'MAJOR_GOD' as const,
              actionType: 'CLAIM_MAJOR_GOD' as const,
              targetCoord: 'B1',
              secondaryTargetCoord: 'B2',
            },
          ],
        },
      },
    };

    const res = resolveSimultaneousTurn(game, privateHands, {}, { round2: [], round3: [] });

    // P2 a 5 Faveurs Divines vs 2 pour P1 -> P2 doit obtenir Zeus !
    expect(res.updatedGame.major_gods_state.ZEUS.ownerId).toBe('p2');
    expect(res.updatedGame.board_tiles.find((t) => t.coord === 'B1')?.building?.cardId).toBe(
      'ZEUS'
    );
    expect(res.updatedGame.board_tiles.find((t) => t.coord === 'A1')?.building).toBeNull();
  });

  it('processes card discard granting +3 drachmas', () => {
    const game = makeInitialGame();

    const privateHands = {
      p1: {
        player_id: 'p1',
        is_bot: false,
        hand_card_ids: ['card_1', 'card_2'],
        reserve_card_ids: [],
        pending_submission: {
          playerId: 'p1',
          pickedFromHand: ['card_1', 'card_2'] as [string, string],
          commands: [
            {
              cardId: 'card_1',
              source: 'HAND' as const,
              actionType: 'DISCARD_FOR_DRACHMAS' as const,
            },
          ],
        },
      },
      p2: {
        player_id: 'p2',
        is_bot: true,
        hand_card_ids: ['card_3', 'card_4'],
        reserve_card_ids: [],
        pending_submission: null,
      },
    };

    const res = resolveSimultaneousTurn(game, privateHands, {}, { round2: [], round3: [] });
    // P1 avait 20 Drachmes -> 23 Drachmes
    expect(res.updatedGame.players_public.p1.drachmas).toBe(23);
  });
});


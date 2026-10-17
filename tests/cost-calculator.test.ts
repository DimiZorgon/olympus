import { describe, expect, it } from 'vitest';
import { calculateNetDrachmaCost, computePlayerResourcePool } from '@/core/engine/CostCalculator';
import { HexTile, PlayerPublicState } from '@/core/types/game.types';

describe('CostCalculator — Bank Rates & Deductions V3.0', () => {
  const dummyPlayer: PlayerPublicState = {
    id: 'p1',
    name: 'TestPlayer',
    isBot: false,
    isAfk: false,
    drachmas: 20,
    olympusFavor: 0,
    scoreHistory: [],
    totalScore: 0,
    reserveCount: 0,
    inhabitants: [],
    malusesUsedOnMeThisRound: 0,
    isReady: false,
  };

  it('calculates cost with standard bank rate of 3 drachmas per missing unit', () => {
    const tiles: HexTile[] = [
      {
        coord: 'A1',
        q: 0,
        r: 0,
        terrain: 'PLAINS',
        ownerId: 'p1',
        building: null,
        activeBrownBuffs: [],
      },
    ];

    const pool = computePlayerResourcePool(tiles, dummyPlayer, [], null);
    expect(pool.bankRate).toBe(3);
    expect(pool.counts.WHEAT).toBe(1);
    expect(pool.counts.WOOD).toBe(0);

    // Nécessite 1 Blé et 2 Bois -> 2 Bois manquants * 3 Drachmes = 6 Drachmes
    const cost = calculateNetDrachmaCost({ WHEAT: 1, WOOD: 2 }, pool, false, false);
    expect(cost).toBe(6);
  });

  it('applies Hermès preferential bank rate of 1 drachma', () => {
    const tiles: HexTile[] = [
      {
        coord: 'A1',
        q: 0,
        r: 0,
        terrain: 'SEA',
        ownerId: 'p1',
        building: {
          cardId: 'god_06',
          templateId: 'GOD_06',
          name: "Temple d'Hermès",
          category: 'SECONDARY_GOD',
          power: 1,
        },
        activeBrownBuffs: [],
      },
    ];

    const pool = computePlayerResourcePool(tiles, dummyPlayer, [], null);
    expect(pool.bankRate).toBe(1);

    // 3 ressources manquantes * 1 Drachme = 3 Drachmes
    const cost = calculateNetDrachmaCost({ MARBLE: 2, BRONZE: 1 }, pool, false, false);
    expect(cost).toBe(3);
  });

  it('applies Phoenician Merchant bank rate of 2 drachmas', () => {
    const playerWithMerchant: PlayerPublicState = {
      ...dummyPlayer,
      inhabitants: ['INH_02_id'],
    };

    const pool = computePlayerResourcePool([], playerWithMerchant, [], null);
    expect(pool.bankRate).toBe(2);

    const cost = calculateNetDrachmaCost({ WOOD: 3 }, pool, false, false);
    expect(cost).toBe(6);
  });

  it('applies Corinth Architect -2 drachmas discount on Major Gods', () => {
    const pool = computePlayerResourcePool([], dummyPlayer, [], null);
    // Coût brut Zeus: 5 Drachmes + ressources
    const costNormal = calculateNetDrachmaCost({ drachmas: 5 }, pool, true, false);
    const costWithArchitect = calculateNetDrachmaCost({ drachmas: 5 }, pool, true, true);

    expect(costNormal).toBe(5);
    expect(costWithArchitect).toBe(3);
  });
});


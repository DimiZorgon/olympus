import { describe, expect, it } from 'vitest';
import { computeEndOfRoundHarvest, computeFinalEndgameBonus } from '@/core/engine/ScoreCalculator';
import { HexTile, PlayerPublicState } from '@/core/types/game.types';

describe('ScoreCalculator — Multiplicative Formula & Final Scoring V3.0', () => {
  const dummyPlayer: PlayerPublicState = {
    id: 'p1',
    name: 'Pericles',
    isBot: false,
    isAfk: false,
    drachmas: 15,
    olympusFavor: 3,
    scoreHistory: [],
    totalScore: 0,
    reserveCount: 0,
    inhabitants: [],
    malusesUsedOnMeThisRound: 0,
    isReady: false,
  };

  it('computes harvest with formula (Powers Sum) * (Distinct Resources)', () => {
    // 2 hexagones adjacents formant un Fief : Plaine (Blé) avec Citadelle (+2 Puissance) et Forêt (Bois)
    const tiles: HexTile[] = [
      {
        coord: 'A1',
        q: 0,
        r: 0,
        terrain: 'PLAINS',
        ownerId: 'p1',
        building: {
          cardId: 'bld_02',
          templateId: 'BLD_CITADEL',
          name: 'Citadelle',
          category: 'BUILDING',
          power: 2,
        },
        activeBrownBuffs: [],
      },
      {
        coord: 'A2',
        q: 1,
        r: 0,
        terrain: 'FOREST',
        ownerId: 'p1',
        building: null,
        activeBrownBuffs: [],
      },
    ];

    const harvest = computeEndOfRoundHarvest(tiles, dummyPlayer, null);
    // Puissance = 2 (Citadelle)
    // Ressources = 2 (Blé, Bois)
    // Total Fief = 2 * 2 = 4 PV
    expect(harvest.fiefPoints).toBe(4);
  });

  it('adds Sanctuary native power (+1) to the city', () => {
    const tiles: HexTile[] = [
      {
        coord: 'A1',
        q: 0,
        r: 0,
        terrain: 'SANCTUARY',
        ownerId: 'p1',
        building: null,
        activeBrownBuffs: [],
      },
    ];

    const harvest = computeEndOfRoundHarvest(tiles, dummyPlayer, null);
    // Sanctuaire seul : +1 Puissance native, 0 ressource native -> 1 * 0 = 0 PV
    expect(harvest.fiefPoints).toBe(0);

    // Ajout d'un hexagone de Rivière connecté (1 Argile)
    tiles.push({
      coord: 'A2',
      q: 1,
      r: 0,
      terrain: 'RIVER',
      ownerId: 'p1',
      building: null,
      activeBrownBuffs: [],
    });

    const harvestWithRiver = computeEndOfRoundHarvest(tiles, dummyPlayer, null);
    // 1 Puissance native (Sanctuaire) * 1 Ressource (Argile) = 1 PV
    expect(harvestWithRiver.fiefPoints).toBe(1);
  });

  it('computes final endgame bonuses including Major Gods and Treasury', () => {
    const majorGods = {
      ZEUS: { available: false, ownerId: 'p1', coords: ['A1', 'A2'] as [string, string] },
      POSEIDON: { available: true, ownerId: null, coords: null },
      HADES: { available: true, ownerId: null, coords: null },
    };

    // Joueur avec Zeus (+10 PV), 15 Drachmes (3 PV car 15/5), et 3 Faveurs Divines (+3 PV)
    const finalBonus = computeFinalEndgameBonus([], dummyPlayer, majorGods);
    expect(finalBonus).toBe(10 + 3 + 3); // 16 PV
  });
});


import { describe, expect, it } from 'vitest';
import { buildScaledDeck, buildScaledDeckFromTemplates, SupabaseCardTemplateRow } from '@/core/data/cards.catalog';
import { generateProceduralIsland } from '@/core/map/IslandGenerator';

describe('Cards Deck Scaling & Supabase Templates V3.0', () => {
  it('builds standard deck with 72 cards for 2 players', () => {
    const tiles = generateProceduralIsland(2);
    const { allCardsMap, shuffledDeckIds } = buildScaledDeck(tiles, 2);

    expect(shuffledDeckIds.length).toBe(72);
    expect(Object.keys(allCardsMap).length).toBe(72);
  });

  it('builds standard deck with 108 cards for 3 players', () => {
    const tiles = generateProceduralIsland(3);
    const { allCardsMap, shuffledDeckIds } = buildScaledDeck(tiles, 3);

    expect(shuffledDeckIds.length).toBe(108);
    expect(Object.keys(allCardsMap).length).toBe(108);
  });

  it('builds standard deck with 144 cards for 4 players', () => {
    const tiles = generateProceduralIsland(4);
    const { allCardsMap, shuffledDeckIds } = buildScaledDeck(tiles, 4);

    expect(shuffledDeckIds.length).toBe(144);
    expect(Object.keys(allCardsMap).length).toBe(144);
  });

  it('builds deck dynamically from mock Supabase template rows', () => {
    const tiles = generateProceduralIsland(2);
    const mockTemplates: SupabaseCardTemplateRow[] = [
      {
        id: 'GOD_01',
        name: "Temple d'Athéna",
        category: 'SECONDARY_GOD',
        min_players: 2,
        cost: { MARBLE: 1, WOOD: 1, CLAY: 1 },
        power: 2,
        victory_points: 4,
        counts: { '2': 1, '3': 1, '4': 1 },
      },
      {
        id: 'BLD_WATCHTOWER',
        name: 'Tour de Garde',
        category: 'BUILDING',
        min_players: 2,
        cost: { WOOD: 1, CLAY: 1 },
        power: 1,
        victory_points: 0,
        counts: { '2': 3, '3': 5, '4': 6 },
      },
    ];

    const { allCardsMap, shuffledDeckIds } = buildScaledDeckFromTemplates(tiles, 2, mockTemplates);

    // 40 tuiles + 1 dieu + 3 tours = 44 cartes
    expect(shuffledDeckIds.length).toBe(44);
    expect(allCardsMap['GOD_01']).toBeDefined();
    expect(allCardsMap['GOD_01'].name).toBe("Temple d'Athéna");
    expect(allCardsMap['BLD_WATCHTOWER_1']).toBeDefined();
    expect(allCardsMap['BLD_WATCHTOWER_2']).toBeDefined();
    expect(allCardsMap['BLD_WATCHTOWER_3']).toBeDefined();
  });
});


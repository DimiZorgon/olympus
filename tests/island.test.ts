import { describe, expect, it } from 'vitest';
import { generateProceduralIsland } from '@/core/map/IslandGenerator';

describe('IslandGenerator — Procedural Generation & Quotas V3.0', () => {
  it('generates 40 tiles for 2 players with exact quotas', () => {
    const tiles = generateProceduralIsland(2);
    expect(tiles).toHaveLength(40);

    const counts: Record<string, number> = {};
    tiles.forEach((t) => {
      counts[t.terrain] = (counts[t.terrain] || 0) + 1;
    });

    expect(counts['PLAINS']).toBe(9);
    expect(counts['FOREST']).toBe(9);
    expect(counts['RIVER']).toBe(6);
    expect(counts['MOUNTAIN_MARBLE']).toBe(5);
    expect(counts['MOUNTAIN_BRONZE']).toBe(4);
    expect(counts['SEA']).toBe(5);
    expect(counts['SANCTUARY']).toBe(2);
  });

  it('generates 55 tiles for 3 players with exact quotas', () => {
    const tiles = generateProceduralIsland(3);
    expect(tiles).toHaveLength(55);

    const counts: Record<string, number> = {};
    tiles.forEach((t) => {
      counts[t.terrain] = (counts[t.terrain] || 0) + 1;
    });

    expect(counts['PLAINS']).toBe(12);
    expect(counts['FOREST']).toBe(12);
    expect(counts['RIVER']).toBe(9);
    expect(counts['MOUNTAIN_MARBLE']).toBe(7);
    expect(counts['MOUNTAIN_BRONZE']).toBe(6);
    expect(counts['SEA']).toBe(6);
    expect(counts['SANCTUARY']).toBe(3);
  });

  it('generates 70 tiles for 4 players with exact quotas', () => {
    const tiles = generateProceduralIsland(4);
    expect(tiles).toHaveLength(70);

    const counts: Record<string, number> = {};
    tiles.forEach((t) => {
      counts[t.terrain] = (counts[t.terrain] || 0) + 1;
    });

    expect(counts['PLAINS']).toBe(15);
    expect(counts['FOREST']).toBe(15);
    expect(counts['RIVER']).toBe(11);
    expect(counts['MOUNTAIN_MARBLE']).toBe(9);
    expect(counts['MOUNTAIN_BRONZE']).toBe(8);
    expect(counts['SEA']).toBe(8);
    expect(counts['SANCTUARY']).toBe(4);
  });

  it('ensures all generated coordinates are strictly unique', () => {
    const tiles = generateProceduralIsland(4);
    const coords = tiles.map((t) => t.coord);
    const uniqueCoords = new Set(coords);
    expect(uniqueCoords.size).toBe(coords.length);
  });
});


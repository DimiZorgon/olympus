import { describe, expect, it } from 'vitest';
import { axialToPixel, computeFiefSvgBoundaries, getHexCorners } from '@/core/map/FiefAnalyzer';
import { HexTile } from '@/core/types/game.types';

describe('FiefAnalyzer — Hexagonal Geometry & SVG Boundaries V3.0', () => {
  it('converts axial coordinates to 2D pixel coordinates', () => {
    const origin = axialToPixel(0, 0, 30);
    expect(origin.x).toBe(0);
    expect(origin.y).toBe(0);

    const neighbor = axialToPixel(1, 0, 30);
    expect(neighbor.x).toBeGreaterThan(0);
    expect(neighbor.y).toBe(0);
  });

  it('calculates 6 corners for an hexagon', () => {
    const corners = getHexCorners({ x: 0, y: 0 }, 30);
    expect(corners).toHaveLength(6);
  });

  it('generates closed boundary SVG path for a fief', () => {
    const tiles: HexTile[] = [
      {
        coord: 'A1',
        q: 0,
        r: 0,
        terrain: 'PLAINS',
        ownerId: 'player1',
        building: null,
        activeBrownBuffs: [],
      },
      {
        coord: 'A2',
        q: 1,
        r: 0,
        terrain: 'FOREST',
        ownerId: 'player1',
        building: null,
        activeBrownBuffs: [],
      },
      {
        coord: 'B1',
        q: 0,
        r: 1,
        terrain: 'SEA',
        ownerId: 'player2',
        building: null,
        activeBrownBuffs: [],
      },
    ];

    const boundaries = computeFiefSvgBoundaries(tiles, 'player1', 30);
    expect(boundaries).toHaveLength(1);
    expect(boundaries[0].pathData).toContain('M');
    expect(boundaries[0].pathData).toContain('Z');
  });
});


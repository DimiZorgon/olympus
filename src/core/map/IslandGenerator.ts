// src/core/map/IslandGenerator.ts
import { HexTile, TerrainType } from '../types/game.types';
import { HEX_DIRECTIONS } from './HexMath';

const TERRAIN_QUOTAS: Record<2 | 3 | 4, Record<TerrainType, number>> = {
  2: {
    PLAINS: 9,
    FOREST: 9,
    RIVER: 6,
    MOUNTAIN_MARBLE: 5,
    MOUNTAIN_BRONZE: 4,
    SEA: 5,
    SANCTUARY: 2,
  },
  3: {
    PLAINS: 12,
    FOREST: 12,
    RIVER: 9,
    MOUNTAIN_MARBLE: 7,
    MOUNTAIN_BRONZE: 6,
    SEA: 6,
    SANCTUARY: 3,
  },
  4: {
    PLAINS: 15,
    FOREST: 15,
    RIVER: 11,
    MOUNTAIN_MARBLE: 9,
    MOUNTAIN_BRONZE: 8,
    SEA: 8,
    SANCTUARY: 4,
  },
};

/**
 * Génère les coordonnées axiales en spirale depuis le centre (0,0)
 */
function generateSpiralCoords(count: number): Array<{ q: number; r: number }> {
  const result: Array<{ q: number; r: number }> = [{ q: 0, r: 0 }];
  let radius = 1;

  while (result.length < count) {
    let q = HEX_DIRECTIONS[4][0] * radius;
    let r = HEX_DIRECTIONS[4][1] * radius;

    for (let side = 0; side < 6; side++) {
      for (let step = 0; step < radius; step++) {
        if (result.length < count) {
          result.push({ q, r });
        }
        q += HEX_DIRECTIONS[side][0];
        r += HEX_DIRECTIONS[side][1];
      }
    }
    radius++;
  }
  return result;
}

function indexToCoordLabel(index: number): string {
  const rowLetter = String.fromCharCode(65 + Math.floor(index / 9)); // A..I
  const colNumber = (index % 9) + 1; // 1..9
  return `${rowLetter}${colNumber}`;
}

export function generateProceduralIsland(playerCount: 2 | 3 | 4): HexTile[] {
  const targetCount = playerCount === 2 ? 40 : playerCount === 3 ? 55 : 70;
  const coords = generateSpiralCoords(targetCount);
  const quotas = TERRAIN_QUOTAS[playerCount];

  const terrainBag: TerrainType[] = [];
  (Object.keys(quotas) as TerrainType[]).forEach((terrain) => {
    for (let i = 0; i < quotas[terrain]; i++) {
      terrainBag.push(terrain);
    }
  });

  // Mélange du sac de biomes
  for (let i = terrainBag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [terrainBag[i], terrainBag[j]] = [terrainBag[j], terrainBag[i]];
  }

  return coords.map((pos, idx) => ({
    coord: indexToCoordLabel(idx),
    q: pos.q,
    r: pos.r,
    terrain: terrainBag[idx],
    ownerId: null,
    building: null,
    activeBrownBuffs: [],
  }));
}
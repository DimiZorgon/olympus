// src/core/map/HexMath.ts
import { HexTile, TerrainType } from '../types/game.types';

export const HEX_DIRECTIONS: Array<[number, number]> = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];

export function hexDistance(a: { q: number; r: number }, b: { q: number; r: number }): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

export function areCoordsAdjacent(tiles: HexTile[], coordA: string, coordB: string): boolean {
  const tileA = tiles.find((t) => t.coord === coordA);
  const tileB = tiles.find((t) => t.coord === coordB);
  if (!tileA || !tileB) return false;
  return hexDistance(tileA, tileB) === 1;
}

export function getNeighbors(tiles: HexTile[], tile: HexTile): HexTile[] {
  return tiles.filter((other) => hexDistance(tile, other) === 1);
}

/**
 * Regroupe les hexagones contrôlés par `playerId` en Cités connectées (Fiefs).
 * Si deux Cités possèdent chacune un "Port de Commerce" (BLD_PORT), elles fusionnent !
 */
export function getPlayerConnectedFiefs(tiles: HexTile[], playerId: string): HexTile[][] {
  const ownedTiles = tiles.filter((t) => t.ownerId === playerId);
  const visited = new Set<string>();
  const rawFiefs: HexTile[][] = [];

  for (const startTile of ownedTiles) {
    if (visited.has(startTile.coord)) continue;
    const fief: HexTile[] = [];
    const queue: HexTile[] = [startTile];
    visited.add(startTile.coord);

    while (queue.length > 0) {
      const current = queue.shift()!;
      fief.push(current);

      const neighbors = getNeighbors(ownedTiles, current);
      for (const n of neighbors) {
        if (!visited.has(n.coord)) {
          visited.add(n.coord);
          queue.push(n);
        }
      }
    }
    rawFiefs.push(fief);
  }

  // Fusion maritime via Port de Commerce (BLD_PORT)
  const portFiefs: HexTile[][] = [];
  const nonPortFiefs: HexTile[][] = [];

  for (const fief of rawFiefs) {
    const hasPort = fief.some((t) => t.building?.templateId === 'BLD_PORT');
    if (hasPort) {
      portFiefs.push(fief);
    } else {
      nonPortFiefs.push(fief);
    }
  }

  if (portFiefs.length > 1) {
    const mergedPortFief = portFiefs.flat();
    return [mergedPortFief, ...nonPortFiefs];
  }

  return rawFiefs;
}

export function getBaseResourceForTerrain(terrain: TerrainType) {
  switch (terrain) {
    case 'PLAINS':
      return 'WHEAT' as const;
    case 'FOREST':
      return 'WOOD' as const;
    case 'RIVER':
      return 'CLAY' as const;
    case 'MOUNTAIN_MARBLE':
      return 'MARBLE' as const;
    case 'MOUNTAIN_BRONZE':
      return 'BRONZE' as const;
    case 'SEA':
      return 'FISH' as const;
    default:
      return null;
  }
}
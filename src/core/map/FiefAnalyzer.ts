// src/core/map/FiefAnalyzer.ts
import { HexTile, ResourceType } from '../types/game.types';
import { getNeighbors, getPlayerConnectedFiefs, HEX_DIRECTIONS } from './HexMath';

export interface Point2D {
  x: number;
  y: number;
}

export interface HexEdge {
  start: Point2D;
  end: Point2D;
}

export interface FiefSvgBoundary {
  fiefIndex: number;
  pathData: string;
  edges: HexEdge[];
}

export interface FiefLiveSummary {
  fiefIndex: number;
  tileCoords: string[];
  centerTileCoord: string;
  uniqueResources: ResourceType[];
  totalPower: number;
  harvestScore: number; // uniqueResources.length * totalPower
  edges3D: Array<{ x1: number; z1: number; x2: number; z2: number }>;
}

export const SQRT_3 = Math.sqrt(3);

export function axialToPixel(q: number, r: number, size: number): Point2D {
  return {
    x: size * SQRT_3 * (q + r / 2),
    y: size * (3 / 2) * r,
  };
}

export function getHexCorners(center: Point2D, size: number): Point2D[] {
  const corners: Point2D[] = [];
  for (let i = 0; i < 6; i++) {
    const angleRad = (Math.PI / 180) * (60 * i - 30);
    corners.push({
      x: center.x + size * Math.cos(angleRad),
      y: center.y + size * Math.sin(angleRad),
    });
  }
  return corners;
}

export const DIRECTION_TO_CORNERS: Array<[number, number]> = [
  [0, 1],
  [5, 0],
  [4, 5],
  [3, 4],
  [2, 3],
  [1, 2],
];

export function computeFiefSvgBoundaries(
  tiles: HexTile[],
  playerId: string,
  hexSize: number
): FiefSvgBoundary[] {
  const fiefs = getPlayerConnectedFiefs(tiles, playerId);
  const tileMap = new Map<string, HexTile>();
  tiles.forEach((t) => tileMap.set(`${t.q},${t.r}`, t));

  return fiefs.map((fief, fiefIndex) => {
    const edges: HexEdge[] = [];
    const pathSegments: string[] = [];

    for (const tile of fief) {
      const center = axialToPixel(tile.q, tile.r, hexSize);
      const corners = getHexCorners(center, hexSize);

      HEX_DIRECTIONS.forEach(([dq, dr], dirIdx) => {
        const neighbor = tileMap.get(`${tile.q + dq},${tile.r + dr}`);
        if (!neighbor || neighbor.ownerId !== playerId) {
          const [c1, c2] = DIRECTION_TO_CORNERS[dirIdx];
          const start = corners[c1];
          const end = corners[c2];
          edges.push({ start, end });
          pathSegments.push(`M ${start.x.toFixed(1)} ${start.y.toFixed(1)} L ${end.x.toFixed(1)} ${end.y.toFixed(1)}`);
        }
      });
    }

    return {
      fiefIndex,
      pathData: pathSegments.join(' '),
      edges,
    };
  });
}

/**
 * Calcule le résumé en direct de chaque Cité (Fief) d'un joueur façon Bunny Kingdom :
 * (Nombre de ressources différentes x Puissance totale des bâtiments) + segments de frontière 3D
 */
export function computePlayerFiefsLiveSummary(
  tiles: HexTile[],
  playerId: string,
  hexRadius3D: number = 1.05
): FiefLiveSummary[] {
  const fiefs = getPlayerConnectedFiefs(tiles, playerId);
  const tileMap = new Map<string, HexTile>();
  tiles.forEach((t) => tileMap.set(`${t.q},${t.r}`, t));

  return fiefs.map((fief, fiefIndex) => {
    const resources = new Set<ResourceType>();
    let totalPower = 0;
    const edges3D: Array<{ x1: number; z1: number; x2: number; z2: number }> = [];

    for (const tile of fief) {
      if (tile.terrain === 'PLAINS') resources.add('WHEAT');
      if (tile.terrain === 'FOREST') resources.add('WOOD');
      if (tile.terrain === 'RIVER') resources.add('CLAY');
      if (tile.terrain === 'MOUNTAIN_MARBLE') resources.add('MARBLE');
      if (tile.terrain === 'MOUNTAIN_BRONZE') resources.add('BRONZE');
      if (tile.terrain === 'SEA') resources.add('FISH');
      if (tile.terrain === 'SANCTUARY') totalPower += 1;

      if (tile.building && !tile.building.isSecondaryHalf) {
        totalPower += tile.building.power;
        if (tile.building.templateId === 'BLD_AQUEDUCT') {
          resources.add('WHEAT');
          if (getNeighbors(tiles, tile).some((n) => n.terrain === 'PLAINS')) totalPower += 1;
        }
        if (tile.building.templateId === 'BLD_GOLDSMITH') resources.add('SACRED_GOLD');
        if (tile.building.templateId === 'GOD_03' || tile.building.templateId === 'GOD_09') {
          resources.add('VINE');
        }
      }

      for (const buff of tile.activeBrownBuffs) {
        if (buff.addedResource) resources.add(buff.addedResource);
        if (buff.addedPower) totalPower += buff.addedPower;
      }

      // Calcul des arêtes extérieures en coordonnées 3D
      const center = axialToPixel(tile.q, tile.r, hexRadius3D);
      const corners = getHexCorners(center, hexRadius3D * 0.98);
      HEX_DIRECTIONS.forEach(([dq, dr], dirIdx) => {
        const neighbor = tileMap.get(`${tile.q + dq},${tile.r + dr}`);
        if (!neighbor || neighbor.ownerId !== playerId) {
          const [c1, c2] = DIRECTION_TO_CORNERS[dirIdx];
          edges3D.push({
            x1: corners[c1].x,
            z1: corners[c1].y,
            x2: corners[c2].x,
            z2: corners[c2].y,
          });
        }
      });
    }

    const uniqueResources = Array.from(resources);
    return {
      fiefIndex,
      tileCoords: fief.map((t) => t.coord),
      centerTileCoord: fief[0]?.coord || 'A1',
      uniqueResources,
      totalPower,
      harvestScore: uniqueResources.length * totalPower,
      edges3D,
    };
  });
}
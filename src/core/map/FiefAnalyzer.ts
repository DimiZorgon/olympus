// src/core/map/FiefAnalyzer.ts
import { HexTile } from '../types/game.types';
import { getNeighbors, getPlayerConnectedFiefs, hexDistance, HEX_DIRECTIONS } from './HexMath';

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
  playerId: string;
  pathData: string;
}

const SQRT_3 = Math.sqrt(3);

/**
 * Convertit des coordonnées axiales (q, r) en coordonnées cartésiennes 2D (pointy-topped)
 */
export function axialToPixel(q: number, r: number, size: number = 32): Point2D {
  const x = size * (SQRT_3 * q + (SQRT_3 / 2) * r);
  const y = size * (3 / 2) * r;
  return { x, y };
}

/**
 * Calcule les 6 sommets d'un hexagone pointy-topped
 */
export function getHexCorners(center: Point2D, size: number = 32): Point2D[] {
  const corners: Point2D[] = [];
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i - 30;
    const angleRad = (Math.PI / 180) * angleDeg;
    corners.push({
      x: Math.round((center.x + size * Math.cos(angleRad)) * 100) / 100,
      y: Math.round((center.y + size * Math.sin(angleRad)) * 100) / 100,
    });
  }
  return corners;
}

/**
 * Associe chaque direction HEX_DIRECTIONS aux 2 sommets correspondants de l'arête
 */
const DIRECTION_TO_CORNERS: Array<[number, number]> = [
  [0, 1], // [1, 0]
  [5, 0], // [1, -1]
  [4, 5], // [0, -1]
  [3, 4], // [-1, 0]
  [2, 3], // [-1, 1]
  [1, 2], // [0, 1]
];

/**
 * Calcule les contours de frontières extérieures d'un Fief (Cité unifiée)
 */
export function computeFiefSvgBoundaries(
  tiles: HexTile[],
  playerId: string,
  hexSize: number = 32
): FiefSvgBoundary[] {
  const fiefs = getPlayerConnectedFiefs(tiles, playerId);
  const tileMap = new Map<string, HexTile>(tiles.map((t) => [t.coord, t]));
  const boundaries: FiefSvgBoundary[] = [];

  fiefs.forEach((fief, fiefIndex) => {
    const fiefCoords = new Set(fief.map((t) => t.coord));
    const exteriorEdges: HexEdge[] = [];

    for (const tile of fief) {
      const center = axialToPixel(tile.q, tile.r, hexSize);
      const corners = getHexCorners(center, hexSize);

      HEX_DIRECTIONS.forEach((dir, dirIndex) => {
        const neighborQ = tile.q + dir[0];
        const neighborR = tile.r + dir[1];
        const neighborTile = tiles.find((t) => t.q === neighborQ && t.r === neighborR);

        // Si le voisin n'appartient pas au Fief, l'arête est extérieure
        if (!neighborTile || !fiefCoords.has(neighborTile.coord)) {
          const [c1Idx, c2Idx] = DIRECTION_TO_CORNERS[dirIndex];
          exteriorEdges.push({
            start: corners[c1Idx],
            end: corners[c2Idx],
          });
        }
      });
    }

    if (exteriorEdges.length === 0) return;

    // Chaînage des arêtes pour former un ou plusieurs polygones fermés
    const pathSegments: string[] = [];
    const remainingEdges = [...exteriorEdges];

    while (remainingEdges.length > 0) {
      const firstEdge = remainingEdges.shift()!;
      let currentPath = `M ${firstEdge.start.x} ${firstEdge.start.y} L ${firstEdge.end.x} ${firstEdge.end.y}`;
      let currentEnd = firstEdge.end;
      const startPoint = firstEdge.start;

      let loopLimit = 200;
      while (loopLimit-- > 0) {
        if (
          Math.abs(currentEnd.x - startPoint.x) < 0.5 &&
          Math.abs(currentEnd.y - startPoint.y) < 0.5
        ) {
          currentPath += ' Z';
          break;
        }

        const nextEdgeIdx = remainingEdges.findIndex(
          (e) =>
            Math.abs(e.start.x - currentEnd.x) < 0.5 && Math.abs(e.start.y - currentEnd.y) < 0.5
        );

        if (nextEdgeIdx !== -1) {
          const nextEdge = remainingEdges.splice(nextEdgeIdx, 1)[0];
          currentPath += ` L ${nextEdge.end.x} ${nextEdge.end.y}`;
          currentEnd = nextEdge.end;
        } else {
          // Si l'arête est inversée
          const revEdgeIdx = remainingEdges.findIndex(
            (e) =>
              Math.abs(e.end.x - currentEnd.x) < 0.5 && Math.abs(e.start.y - currentEnd.y) < 0.5
          );
          if (revEdgeIdx !== -1) {
            const revEdge = remainingEdges.splice(revEdgeIdx, 1)[0];
            currentPath += ` L ${revEdge.start.x} ${revEdge.start.y}`;
            currentEnd = revEdge.start;
          } else {
            currentPath += ' Z';
            break;
          }
        }
      }

      pathSegments.push(currentPath);
    }

    boundaries.push({
      fiefIndex,
      playerId,
      pathData: pathSegments.join(' '),
    });
  });

  return boundaries;
}


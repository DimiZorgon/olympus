// src/core/map/IslandGenerator.ts
import { HexTile, TerrainType } from '../types/game.types';
import { HEX_DIRECTIONS, hexDistance } from './HexMath';

// Quotas pour l'Île de 100 Hexagones
const QUOTAS_100: Record<TerrainType, number> = {
  PLAINS: 20,           // Grandes vallées fertiles
  FOREST: 20,           // Forêts denses
  RIVER: 14,            // Rivières continues
  MOUNTAIN_MARBLE: 14,  // Hauts massifs
  MOUNTAIN_BRONZE: 12,  // Collines métallifères
  SEA: 14,              // Côtes et baies maritimes
  SANCTUARY: 6,         // Sanctuaires sacrés
};

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
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const rowLetter = letters[Math.floor(index / 10)] || 'X';
  const colNumber = (index % 10) + 1;
  return `${rowLetter}${colNumber}`; // A1 à J10
}

/**
 * Génère une île de 100 tuiles par propagation de biomes groupés (massifs, vallées, côtes)
 */
export function generateProceduralIsland(playerCount: 2 | 3 | 4 = 4): HexTile[] {
  const targetCount = 100;
  const coords = generateSpiralCoords(targetCount);

  // 1. Détecter les cases extérieures pour y concentrer les côtes (SEA)
  const maxDist = Math.max(...coords.map((c) => hexDistance({ q: 0, r: 0 }, c)));
  const outerCoords = coords.filter((c) => hexDistance({ q: 0, r: 0 }, c) >= maxDist - 1);

  // 2. Initialiser les tuiles
  const assigned = new Map<string, TerrainType>();

  // Placer les Sanctuaires (répartis sur l'île)
  const sanctuaryIndices = [0, 18, 38, 58, 78, 92];
  sanctuaryIndices.forEach((idx) => {
    if (idx < coords.length) {
      const c = coords[idx];
      assigned.set(`${c.q},${c.r}`, 'SANCTUARY');
    }
  });

  // Placer les cases côtières (SEA) sur le pourtour
  let seaPlaced = 0;
  for (const c of outerCoords) {
    const key = `${c.q},${c.r}`;
    if (!assigned.has(key) && seaPlaced < QUOTAS_100.SEA) {
      assigned.set(key, 'SEA');
      seaPlaced++;
    }
  }

  // 3. Paniers de biomes restants pour la propagation en clusters
  const remainingCounts = { ...QUOTAS_100 };
  remainingCounts.SANCTUARY = 0;
  remainingCounts.SEA -= seaPlaced;

  // Centres de massifs (Seeds)
  const clusterSeeds: Array<{ terrain: TerrainType; center: { q: number; r: number } }> = [
    { terrain: 'MOUNTAIN_MARBLE', center: { q: 2, r: -2 } },
    { terrain: 'MOUNTAIN_BRONZE', center: { q: -2, r: 2 } },
    { terrain: 'FOREST', center: { q: -3, r: -1 } },
    { terrain: 'PLAINS', center: { q: 1, r: 3 } },
    { terrain: 'RIVER', center: { q: 0, r: 1 } },
  ];

  // Remplissage par affinité de distance avec les centres de massifs
  coords.forEach((c) => {
    const key = `${c.q},${c.r}`;
    if (assigned.has(key)) return;

    // Trier les graines par proximité
    const sortedSeeds = [...clusterSeeds].sort(
      (a, b) => hexDistance(c, a.center) - hexDistance(c, b.center)
    );

    let chosenTerrain: TerrainType = 'PLAINS';
    for (const seed of sortedSeeds) {
      if (remainingCounts[seed.terrain] > 0) {
        chosenTerrain = seed.terrain;
        remainingCounts[seed.terrain]--;
        break;
      }
    }

    // Repli si le quota est plein
    if (!chosenTerrain) {
      const available = (Object.keys(remainingCounts) as TerrainType[]).find(
        (t) => remainingCounts[t] > 0
      );
      chosenTerrain = available || 'PLAINS';
      remainingCounts[chosenTerrain]--;
    }

    assigned.set(key, chosenTerrain);
  });

  return coords.map((pos, idx) => ({
    coord: indexToCoordLabel(idx),
    q: pos.q,
    r: pos.r,
    terrain: assigned.get(`${pos.q},${pos.r}`) || 'PLAINS',
    ownerId: null,
    building: null,
    activeBrownBuffs: [],
  }));
}
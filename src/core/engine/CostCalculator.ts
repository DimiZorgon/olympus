// src/core/engine/CostCalculator.ts
import {
  HexTile,
  PlayerPublicState,
  ResourceCost,
  ResourceType,
} from '../types/game.types';
import { getNeighbors } from '../map/HexMath';

export interface PlayerResourcePool {
  counts: Record<Exclude<ResourceType, 'ANY_BASE'>, number>;
  jokers: number;
  hasHephaestusDiscount: boolean;
  bankRate: number;
}

export function computePlayerResourcePool(
  tiles: HexTile[],
  player: PlayerPublicState,
  capturedResources: Array<Exclude<ResourceType, 'ANY_BASE'>>,
  activeCapriceId: string | null
): PlayerResourcePool {
  const counts: Record<Exclude<ResourceType, 'ANY_BASE'>, number> = {
    WHEAT: 0,
    WOOD: 0,
    CLAY: 0,
    MARBLE: 0,
    BRONZE: 0,
    FISH: 0,
    VINE: 0,
    SACRED_GOLD: 0,
  };
  let jokers = 0;

  const ownedTiles = tiles.filter((t) => t.ownerId === player.id && !t.disabledNextTurn);

  // Identifier les cases polluées par le Temple d'Héphaïstos (GOD_05)
  const hephaestusTiles = ownedTiles.filter((t) => t.building?.templateId === 'GOD_05');
  const pollutedCoords = new Set<string>();
  for (const hTile of hephaestusTiles) {
    for (const n of getNeighbors(tiles, hTile)) {
      if (n.terrain === 'FOREST' || n.terrain === 'PLAINS') {
        pollutedCoords.add(n.coord);
      }
    }
  }

  for (const tile of ownedTiles) {
    // 1. Production native de l'hexagone
    if (!pollutedCoords.has(tile.coord)) {
      if (tile.terrain === 'PLAINS') counts.WHEAT++;
      if (tile.terrain === 'FOREST') counts.WOOD++;
      if (tile.terrain === 'RIVER') counts.CLAY++;
      if (tile.terrain === 'MOUNTAIN_MARBLE') counts.MARBLE++;
      if (tile.terrain === 'MOUNTAIN_BRONZE') counts.BRONZE++;
      if (tile.terrain === 'SEA') counts.FISH++;
    }

    // 2. Production ajoutée par le bâtiment (Aqueduc, Orfèvre, Artémis, Dionysos)
    if (tile.building?.templateId === 'BLD_AQUEDUCT') counts.WHEAT++;
    if (tile.building?.templateId === 'BLD_GOLDSMITH') counts.SACRED_GOLD++;
    if (tile.building?.templateId === 'GOD_03' || tile.building?.templateId === 'GOD_09') {
      counts.VINE++;
    }

    // 3. Cartes Marron actives sur la case
    for (const buff of tile.activeBrownBuffs) {
      if (buff.addedResource === 'ANY_BASE') {
        jokers++;
      } else if (buff.addedResource) {
        counts[buff.addedResource]++;
      }
    }
  }

  // 4. Ajout des ressources capturées ce tour-ci (Malus)
  for (const res of capturedResources) {
    counts[res]++;
  }

  // 5. Calcul du taux de la Banque (Défaut = 3)
  let bankRate = 3;
  if (player.inhabitants.some((i) => i.startsWith('INH_02'))) bankRate = 2; // Marchand Phénicien
  if (ownedTiles.some((t) => t.building?.templateId === 'GOD_06')) bankRate = 1; // Hermès
  if (ownedTiles.some((t) => t.building?.templateId === 'GOD_04')) bankRate += 1; // Malus Arès
  if (activeCapriceId === 'CAP_01') bankRate += 1; // Caprice d'Apollon

  return {
    counts,
    jokers,
    hasHephaestusDiscount: hephaestusTiles.length > 0,
    bankRate,
  };
}

/**
 * Calcule le nombre total de Drachmes à débourser (coût fixe en Drachmes + achats à la Banque)
 */
export function calculateNetDrachmaCost(
  cost: ResourceCost,
  pool: PlayerResourcePool,
  isMajorGod: boolean,
  hasCorinthArchitect: boolean
): number {
  let missingUnits = 0;
  const resourceKeys = Object.keys(cost).filter((k) => k !== 'drachmas') as Array<
    Exclude<ResourceType, 'ANY_BASE'>
  >;

  for (const res of resourceKeys) {
    const needed = cost[res] || 0;
    const available = pool.counts[res] || 0;
    if (needed > available) {
      missingUnits += needed - available;
    }
  }

  // Application des Jokers (Caravane de Mécènes) et de la remise d'Héphaïstos (-1 ressource)
  const totalFreeReductions = pool.jokers + (pool.hasHephaestusDiscount && !isMajorGod ? 1 : 0);
  const netMissingResources = Math.max(0, missingUnits - totalFreeReductions);

  let directDrachmas = cost.drachmas || 0;
  if (isMajorGod && hasCorinthArchitect) {
    directDrachmas = Math.max(0, directDrachmas - 2);
  }

  return directDrachmas + netMissingResources * pool.bankRate;
}
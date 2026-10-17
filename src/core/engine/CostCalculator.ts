// src/core/engine/CostCalculator.ts
import {
  CardDefinition,
  HexTile,
  PlayerPublicState,
  ResourceCost,
  ResourceType,
  TerrainType,
} from '../types/game.types';
import { getNeighbors } from '../map/HexMath';

export interface PlayerResourcePool {
  counts: Record<Exclude<ResourceType, 'ANY_BASE'>, number>;
  jokers: number;
  hasHephaestusDiscount: boolean;
  bankRate: number;
}

export interface CardPlayabilityReport {
  canPlay: boolean;
  isFree: boolean;
  netDrachmaCost: number;
  directDrachmaCost: number;
  bankDrachmaCost: number;
  missingResources: Array<{ resource: Exclude<ResourceType, 'ANY_BASE'>; missing: number }>;
  validTargetCoords: string[];
  errorMessage: string | null;
}

export const RESOURCE_LABELS_FR: Record<Exclude<ResourceType, 'ANY_BASE'>, { name: string; icon: string }> = {
  WHEAT: { name: 'Blé', icon: '🌾' },
  WOOD: { name: 'Bois', icon: '🪵' },
  CLAY: { name: 'Argile', icon: '🏺' },
  MARBLE: { name: 'Marbre', icon: '🏛️' },
  BRONZE: { name: 'Bronze', icon: '🛡️' },
  FISH: { name: 'Poisson', icon: '🐟' },
  VINE: { name: 'Vigne', icon: '🍇' },
  SACRED_GOLD: { name: 'Or Sacré', icon: '✨' },
};

export const TERRAIN_LABELS_FR: Record<TerrainType, string> = {
  PLAINS: 'Plaine',
  FOREST: 'Forêt',
  RIVER: 'Rivière',
  MOUNTAIN_MARBLE: 'Montagne (Marbre)',
  MOUNTAIN_BRONZE: 'Montagne (Bronze)',
  SEA: 'Mer / Côte',
  SANCTUARY: 'Sanctuaire',
};

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

  // Cases polluées par le Temple d'Héphaïstos (GOD_05)
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
    if (!pollutedCoords.has(tile.coord)) {
      if (tile.terrain === 'PLAINS') counts.WHEAT++;
      if (tile.terrain === 'FOREST') counts.WOOD++;
      if (tile.terrain === 'RIVER') counts.CLAY++;
      if (tile.terrain === 'MOUNTAIN_MARBLE') counts.MARBLE++;
      if (tile.terrain === 'MOUNTAIN_BRONZE') counts.BRONZE++;
      if (tile.terrain === 'SEA') counts.FISH++;
    }

    if (tile.building?.templateId === 'BLD_AQUEDUCT') counts.WHEAT++;
    if (tile.building?.templateId === 'BLD_GOLDSMITH') counts.SACRED_GOLD++;
    if (tile.building?.templateId === 'GOD_03' || tile.building?.templateId === 'GOD_09') {
      counts.VINE++;
    }

    for (const buff of tile.activeBrownBuffs) {
      if (buff.addedResource === 'ANY_BASE') {
        jokers++;
      } else if (buff.addedResource) {
        counts[buff.addedResource]++;
      }
    }
  }

  for (const res of capturedResources) {
    counts[res]++;
  }

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

  const totalFreeReductions = pool.jokers + (pool.hasHephaestusDiscount && !isMajorGod ? 1 : 0);
  const netMissingResources = Math.max(0, missingUnits - totalFreeReductions);

  let directDrachmas = cost.drachmas || 0;
  if (isMajorGod && hasCorinthArchitect) {
    directDrachmas = Math.max(0, directDrachmas - 2);
  }

  return directDrachmas + netMissingResources * pool.bankRate;
}

/**
 * Analyse complète style 7 Wonders pour l'UI : coût Banque, cases éligibles et raison exacte de blocage
 */
export function evaluateCardPlayability(
  card: CardDefinition,
  tiles: HexTile[],
  player: PlayerPublicState,
  availableDrachmas: number,
  capturedResources: Array<Exclude<ResourceType, 'ANY_BASE'>> = [],
  activeCapriceId: string | null = null
): CardPlayabilityReport {
  const pool = computePlayerResourcePool(tiles, player, capturedResources, activeCapriceId);
  const missingResources: Array<{ resource: Exclude<ResourceType, 'ANY_BASE'>; missing: number }> = [];

  const resourceKeys = Object.keys(card.cost || {}).filter((k) => k !== 'drachmas') as Array<
    Exclude<ResourceType, 'ANY_BASE'>
  >;

  let rawMissingCount = 0;
  for (const res of resourceKeys) {
    const needed = card.cost[res] || 0;
    const have = pool.counts[res] || 0;
    if (needed > have) {
      const diff = needed - have;
      rawMissingCount += diff;
      missingResources.push({ resource: res, missing: diff });
    }
  }

  const reductions = pool.jokers + (pool.hasHephaestusDiscount ? 1 : 0);
  const netMissingCount = Math.max(0, rawMissingCount - reductions);
  const directDrachmaCost = card.cost.drachmas || 0;
  const bankDrachmaCost = netMissingCount * pool.bankRate;
  const netDrachmaCost = directDrachmaCost + bankDrachmaCost;

  // 1. Cas particulier : Carte Territoire
  if (card.category === 'TERRITORY') {
    const targetTile = tiles.find((t) => t.coord === card.targetCoord);
    const isFreeTile = targetTile && !targetTile.ownerId;
    return {
      canPlay: Boolean(isFreeTile),
      isFree: true,
      netDrachmaCost: 0,
      directDrachmaCost: 0,
      bankDrachmaCost: 0,
      missingResources: [],
      validTargetCoords: isFreeTile && card.targetCoord ? [card.targetCoord] : [],
      errorMessage: isFreeTile ? null : `L'hexagone ${card.targetCoord} est déjà occupé.`,
    };
  }

  // 2. Calcul des hexagones valides pour Bâtiment / Dieu Secondaire / Ressource Spéciale
  let validTargetCoords: string[] = [];
  if (
    card.category === 'BUILDING' ||
    card.category === 'SECONDARY_GOD' ||
    card.category === 'SPECIAL_RESOURCE'
  ) {
    validTargetCoords = tiles
      .filter((t) => {
        if (t.ownerId !== player.id) return false;
        if (card.category === 'SPECIAL_RESOURCE') return true; // Posable sur toute case contrôlée
        if (t.building) return false; // Case déjà bâtie
        if (t.terrain === 'SANCTUARY' && card.category !== 'SECONDARY_GOD') return false;
        if (card.allowedTerrains && !card.allowedTerrains.includes(t.terrain)) return false;
        return true;
      })
      .map((t) => t.coord);
  }

  // 3. Vérification des blocages (Argent / Ressources / Emplacement)
  if (netDrachmaCost > availableDrachmas) {
    const missingDesc = missingResources
      .map((m) => `${m.missing} ${RESOURCE_LABELS_FR[m.resource].icon} ${RESOURCE_LABELS_FR[m.resource].name}`)
      .join(', ');
    const details = missingDesc
      ? `Il vous manque ${missingDesc} (Banque : ${bankDrachmaCost} 🪙)`
      : `Coût direct : ${directDrachmaCost} 🪙`;

    return {
      canPlay: false,
      isFree: false,
      netDrachmaCost,
      directDrachmaCost,
      bankDrachmaCost,
      missingResources,
      validTargetCoords,
      errorMessage: `Ressources/Drachmes insuffisantes pour « ${card.name} » — ${details}. Il vous faut ${netDrachmaCost} 🪙 mais vous n'avez que ${availableDrachmas} 🪙. (Vous pouvez la mettre au Chantier ou la défausser pour +3 🪙).`,
    };
  }

  if (
    (card.category === 'BUILDING' ||
      card.category === 'SECONDARY_GOD' ||
      card.category === 'SPECIAL_RESOURCE') &&
    validTargetCoords.length === 0
  ) {
    const allowedText = card.allowedTerrains
      ? card.allowedTerrains.map((t) => TERRAIN_LABELS_FR[t]).join(' ou ')
      : 'case libre';
    return {
      canPlay: false,
      isFree: netDrachmaCost === 0,
      netDrachmaCost,
      directDrachmaCost,
      bankDrachmaCost,
      missingResources,
      validTargetCoords: [],
      errorMessage: `Aucun emplacement valide pour « ${card.name} » ! Vous devez contrôler un hexagone libre de type : ${allowedText}. (Mettez cette carte au Chantier en attendant de capturer le bon terrain !)`,
    };
  }

  return {
    canPlay: true,
    isFree: netDrachmaCost === 0,
    netDrachmaCost,
    directDrachmaCost,
    bankDrachmaCost,
    missingResources,
    validTargetCoords,
    errorMessage: null,
  };
}
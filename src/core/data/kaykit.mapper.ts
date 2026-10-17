// src/core/data/kaykit.mapper.ts
import { TerrainType } from '../types/game.types';

export type KayKitPlayerColor = 'blue' | 'red' | 'yellow' | 'green';

export const PLAYER_COLORS: Array<{
  name: KayKitPlayerColor;
  hex: string;
  fill: string;
  label: string;
}> = [
  { name: 'blue', hex: '#2563EB', fill: 'rgba(37, 99, 235, 0.28)', label: 'Bleu' },
  { name: 'red', hex: '#DC2626', fill: 'rgba(220, 38, 38, 0.28)', label: 'Rouge' },
  { name: 'yellow', hex: '#D97706', fill: 'rgba(217, 119, 6, 0.28)', label: 'Jaune' },
  { name: 'green', hex: '#16A34A', fill: 'rgba(22, 163, 74, 0.28)', label: 'Vert' },
];

export const KAYKIT_TERRAIN_MAP: Record<
  TerrainType,
  {
    fillColor: string;
    strokeColor: string;
    icon: string;
    label: string;
    resourceLabel: string;
    kaykitTileAsset: string;
    kaykitDecorationAsset?: string;
  }
> = {
  PLAINS: {
    fillColor: '#DCE775', // Vert-jaune clair (Hex_Grass KayKit)
    strokeColor: '#9E9D24',
    icon: '🌾',
    label: 'Plaine',
    resourceLabel: 'Blé',
    kaykitTileAsset: 'tiles/base/hex_grass.png',
    kaykitDecorationAsset: 'decoration/nature/wheat_field.png',
  },
  FOREST: {
    fillColor: '#81C784', // Vert forêt (Trees KayKit)
    strokeColor: '#2E7D32',
    icon: '🌲',
    label: 'Forêt',
    resourceLabel: 'Bois',
    kaykitTileAsset: 'tiles/base/hex_grass.png',
    kaykitDecorationAsset: 'decoration/nature/trees_A_large.png',
  },
  RIVER: {
    fillColor: '#64B5F6', // Rivière KayKit (tiles/rivers/hex_river_A)
    strokeColor: '#1976D2',
    icon: '🏺',
    label: 'Rivière',
    resourceLabel: 'Argile',
    kaykitTileAsset: 'tiles/rivers/hex_river_A.png',
  },
  MOUNTAIN_MARBLE: {
    fillColor: '#CFD8DC', // Roche claire (hills/mountain KayKit)
    strokeColor: '#607D8B',
    icon: '🏛️',
    label: 'Montagne',
    resourceLabel: 'Marbre',
    kaykitTileAsset: 'tiles/base/hex_grass.png',
    kaykitDecorationAsset: 'decoration/nature/mountain_A_grass.png',
  },
  MOUNTAIN_BRONZE: {
    fillColor: '#BCAAA4', // Roche cuivrée (Mine KayKit)
    strokeColor: '#5D4037',
    icon: '🛡️',
    label: 'Colline',
    resourceLabel: 'Bronze',
    kaykitTileAsset: 'tiles/base/hex_grass.png',
    kaykitDecorationAsset: 'decoration/nature/hill_single_C.png',
  },
  SEA: {
    fillColor: '#29B6F6', // Côte / Eau (hex_water / coast KayKit)
    strokeColor: '#0277BD',
    icon: '🐟',
    label: 'Mer',
    resourceLabel: 'Poisson',
    kaykitTileAsset: 'tiles/coast/hex_water.png',
  },
  SANCTUARY: {
    fillColor: '#E1BEE7', // Sanctuaire sacré
    strokeColor: '#6A1B9A',
    icon: '⚡',
    label: 'Sanctuaire',
    resourceLabel: '+1 Puiss.',
    kaykitTileAsset: 'tiles/base/hex_grass.png',
    kaykitDecorationAsset: 'buildings/neutral/shrine.png',
  },
};

export const KAYKIT_BUILDING_ASSETS: Record<string, { icon: string; kaykitModel: string }> = {
  BLD_WATCHTOWER: { icon: '🗼', kaykitModel: 'building_tower_A' },
  BLD_CITADEL: { icon: '🏰', kaykitModel: 'building_tower_B' },
  BLD_PARTHENON: { icon: '🏛️', kaykitModel: 'building_castle' },
  BLD_AGORA: { icon: '⚖️', kaykitModel: 'building_market' },
  BLD_PORT: { icon: '⚓', kaykitModel: 'building_shipyard' },
  BLD_AQUEDUCT: { icon: '⛲', kaykitModel: 'building_watermill' },
  BLD_GOLDSMITH: { icon: '⚒️', kaykitModel: 'building_blacksmith' },
  BLD_WAREHOUSE: { icon: '📦', kaykitModel: 'building_LUMBERMILL' },
};
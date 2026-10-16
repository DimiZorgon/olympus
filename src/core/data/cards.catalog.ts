// src/core/data/cards.catalog.ts
import {
  CardDefinition,
  CapriceDefinition,
  HexTile,
  MajorGodDefinition,
  MajorGodId,
  TerrainType,
} from '../types/game.types';

export const MAJOR_GODS_CATALOG: Record<MajorGodId, MajorGodDefinition> = {
  ZEUS: {
    id: 'ZEUS',
    name: 'Grand Temple de Zeus',
    minPlayers: 2,
    cost: { MARBLE: 2, BRONZE: 1, WHEAT: 1, drachmas: 5 },
    power: 3,
    victoryPoints: 10,
    primaryTerrains: ['MOUNTAIN_MARBLE', 'MOUNTAIN_BRONZE', 'SANCTUARY'],
    secondaryTerrains: [], // N'importe quel hexagone adjacent
    description: '+3 Puissance, +10 PV finaux, +2 Faveur Divine immédiate.',
  },
  POSEIDON: {
    id: 'POSEIDON',
    name: 'Grand Temple de Poséidon',
    minPlayers: 3,
    cost: { WOOD: 2, FISH: 2, MARBLE: 1, drachmas: 5 },
    power: 3,
    victoryPoints: 10,
    primaryTerrains: ['SEA', 'RIVER'],
    secondaryTerrains: [],
    description: '+3 Puissance, +10 PV finaux, +1 Drachme par case Mer à chaque récolte.',
  },
  HADES: {
    id: 'HADES',
    name: "Grand Temple d'Hadès",
    minPlayers: 4,
    cost: { BRONZE: 2, CLAY: 1, WOOD: 1, drachmas: 5 },
    power: 3,
    victoryPoints: 10,
    primaryTerrains: ['MOUNTAIN_MARBLE', 'MOUNTAIN_BRONZE'],
    secondaryTerrains: ['FOREST', 'SANCTUARY'],
    description: '+3 Puissance, +10 PV finaux, immunise sa Cité contre les Malus de capture.',
  },
};

export const CAPRICES_CATALOG: CapriceDefinition[] = [
  {
    id: 'CAP_01',
    name: "Âge d'Or d'Apollon",
    description: 'Toutes les Cités gagnent +1 Puissance, mais la Banque coûte +1 Drachme.',
  },
  {
    id: 'CAP_02',
    name: 'Trêve Olympique',
    description: 'Les Malus ne peuvent plus être joués à la Manche 3 (mais donnent +4 Drachmes si défaussés).',
  },
  {
    id: 'CAP_03',
    name: 'Fièvre Architecturale',
    description: 'Chaque bâtiment construit au Tour 6 rapporte +2 PV immédiats.',
  },
  {
    id: 'CAP_04',
    name: 'Abondance de Déméter',
    description: 'Chaque ressource exotique (Vigne, Or Sacré) compte double dans la diversité de la Cité.',
  },
];

// Les 10 Dieux Secondaires (Uniques)
export const SECONDARY_GODS_TEMPLATES: Omit<CardDefinition, 'id'>[] = [
  {
    templateId: 'GOD_01',
    name: "Temple d'Athéna",
    category: 'SECONDARY_GOD',
    minPlayers: 2,
    cost: { MARBLE: 1, WOOD: 1, CLAY: 1 },
    allowedTerrains: ['PLAINS', 'MOUNTAIN_MARBLE', 'MOUNTAIN_BRONZE', 'SANCTUARY'],
    power: 2,
    victoryPoints: 4,
    description: '+4 PV finaux.',
    bonusText: '+2 PV par bâtiment civil (Bleu) adjacent.',
    malusText: "-3 PV si adjacent au Temple d'Arès.",
  },
  {
    templateId: 'GOD_02',
    name: "Temple d'Apollon",
    category: 'SECONDARY_GOD',
    minPlayers: 2,
    cost: { MARBLE: 2, WHEAT: 1 },
    allowedTerrains: ['PLAINS', 'SANCTUARY'],
    power: 2,
    victoryPoints: 5,
    description: '+5 PV finaux.',
    bonusText: '+2 Drachmes par récolte si au moins 2 cases adjacentes sont sans bâtiment.',
    malusText: '-1 Puissance pour chaque bâtiment adjacent.',
  },
  {
    templateId: 'GOD_03',
    name: "Temple d'Artémis",
    category: 'SECONDARY_GOD',
    minPlayers: 2,
    cost: { WOOD: 2, FISH: 1 },
    allowedTerrains: ['FOREST'],
    power: 2,
    victoryPoints: 0,
    producedResource: 'VINE',
    description: 'Produit 1 Vigne/Gibier.',
    bonusText: '+2 PV finaux par case Forêt dans la même Cité.',
    malusText: '-2 PV pour chaque case Plaine adjacente.',
  },
  {
    templateId: 'GOD_04',
    name: "Temple d'Arès",
    category: 'SECONDARY_GOD',
    minPlayers: 2,
    cost: { BRONZE: 2, WOOD: 1 },
    allowedTerrains: ['MOUNTAIN_MARBLE', 'MOUNTAIN_BRONZE', 'PLAINS'],
    power: 3,
    victoryPoints: 3,
    description: '+3 Puissance, +3 PV finaux.',
    bonusText: '+2 PV par case adverse adjacente au Temple.',
    malusText: 'Le commerce avec la Banque vous coûte +1 Drachme par ressource.',
  },
  {
    templateId: 'GOD_05',
    name: "Temple d'Héphaïstos",
    category: 'SECONDARY_GOD',
    minPlayers: 2,
    cost: { BRONZE: 2, CLAY: 1 },
    allowedTerrains: ['MOUNTAIN_MARBLE', 'MOUNTAIN_BRONZE'],
    power: 2,
    victoryPoints: 4,
    description: '+4 PV finaux.',
    bonusText: 'Réduit de -1 Ressource au choix le coût de vos futurs bâtiments.',
    malusText: 'Les cases Forêt et Plaine directement adjacentes ne produisent plus leur ressource.',
  },
  {
    templateId: 'GOD_06',
    name: "Temple d'Hermès",
    category: 'SECONDARY_GOD',
    minPlayers: 3,
    cost: { WOOD: 1, CLAY: 1, drachmas: 3 },
    allowedTerrains: ['SEA', 'RIVER'],
    power: 1,
    victoryPoints: 2,
    description: '+1 Puissance, +2 PV finaux.',
    bonusText: 'Banque à 1 Drachme par ressource manquante + 3 Drachmes par récolte.',
    malusText: '-4 PV en fin de partie si sa Cité compte moins de 3 hexagones.',
  },
  {
    templateId: 'GOD_07',
    name: 'Temple de Déméter',
    category: 'SECONDARY_GOD',
    minPlayers: 3,
    cost: { WHEAT: 2, CLAY: 1 },
    allowedTerrains: ['PLAINS', 'RIVER'],
    power: 2,
    victoryPoints: 4,
    description: '+4 PV finaux.',
    bonusText: '+1 Puissance supplémentaire par case Plaine dans la Cité.',
    malusText: '-1 Puissance si adjacent à une Montagne.',
  },
  {
    templateId: 'GOD_08',
    name: "Temple d'Aphrodite",
    category: 'SECONDARY_GOD',
    minPlayers: 3,
    cost: { MARBLE: 1, FISH: 1, drachmas: 3 },
    allowedTerrains: ['SEA', 'SANCTUARY'],
    power: 2,
    victoryPoints: 2,
    description: '+2 Faveur Divine immédiate.',
    bonusText: '+2 PV finaux par carte Habitant que vous possédez.',
    malusText: "-5 PV si dans la même Cité que le Temple d'Héra ou d'Athéna.",
  },
  {
    templateId: 'GOD_09',
    name: 'Temple de Dionysos',
    category: 'SECONDARY_GOD',
    minPlayers: 4,
    cost: { WOOD: 1, WHEAT: 1, CLAY: 1 },
    allowedTerrains: ['PLAINS', 'FOREST'],
    power: 2,
    victoryPoints: 3,
    producedResource: 'VINE',
    description: 'Produit la ressource exotique permanente Vigne.',
    bonusText: '+1 type de ressource rare pour le multiplicateur de Cité.',
    malusText: 'Les bâtiments adjacents au Temple de Dionysos perdent -1 Puissance (min 0).',
  },
  {
    templateId: 'GOD_10',
    name: "Temple d'Héra",
    category: 'SECONDARY_GOD',
    minPlayers: 4,
    cost: { MARBLE: 2, WHEAT: 1, drachmas: 3 },
    allowedTerrains: ['SANCTUARY', 'MOUNTAIN_MARBLE', 'MOUNTAIN_BRONZE'],
    power: 3,
    victoryPoints: 6,
    description: '+3 Puissance, +6 PV finaux.',
    bonusText: 'Passe à +12 PV si vous possédez le Grand Temple de Zeus.',
    malusText: '-5 Drachmes en fin de partie si vous ne possédez aucun Grand Temple.',
  },
];

// Modèles des Bâtiments Civils (24 max), Ressources Marron (12 max), Habitants (10 max), Bonus (6 max), Malus (12 max)
interface ScaledTemplate {
  counts: { 2: number; 3: number; 4: number };
  card: Omit<CardDefinition, 'id' | 'minPlayers'>;
}

const SCALED_TEMPLATES: ScaledTemplate[] = [
  // --- BÂTIMENTS CIVILS (12 / 18 / 24) ---
  {
    counts: { 2: 3, 3: 5, 4: 6 },
    card: {
      templateId: 'BLD_WATCHTOWER',
      name: 'Tour de Garde (Acropole I)',
      category: 'BUILDING',
      cost: { WOOD: 1, CLAY: 1 },
      allowedTerrains: ['PLAINS', 'FOREST', 'RIVER', 'MOUNTAIN_MARBLE', 'MOUNTAIN_BRONZE', 'SEA'],
      power: 1,
      victoryPoints: 0,
      description: '+1 Puissance pour la Cité.',
    },
  },
  {
    counts: { 2: 2, 3: 3, 4: 4 },
    card: {
      templateId: 'BLD_CITADEL',
      name: 'Citadelle Grecque (Acropole II)',
      category: 'BUILDING',
      cost: { MARBLE: 1, WOOD: 1, BRONZE: 1 },
      allowedTerrains: ['MOUNTAIN_MARBLE', 'MOUNTAIN_BRONZE', 'PLAINS'],
      power: 2,
      victoryPoints: 0,
      description: '+2 Puissance pour la Cité.',
    },
  },
  {
    counts: { 2: 1, 3: 2, 4: 2 },
    card: {
      templateId: 'BLD_PARTHENON',
      name: 'Parthénon Civique (Acropole III)',
      category: 'BUILDING',
      cost: { MARBLE: 2, BRONZE: 1, WOOD: 1 },
      allowedTerrains: ['MOUNTAIN_MARBLE', 'MOUNTAIN_BRONZE'],
      power: 3,
      victoryPoints: 0,
      description: '+3 Puissance pour la Cité.',
    },
  },
  {
    counts: { 2: 2, 3: 2, 4: 3 },
    card: {
      templateId: 'BLD_AGORA',
      name: 'Agora (Marché)',
      category: 'BUILDING',
      cost: { WOOD: 1, WHEAT: 1 },
      allowedTerrains: ['PLAINS', 'RIVER'],
      power: 1,
      victoryPoints: 0,
      description: '+1 Puissance et génère +3 Drachmes à chaque fin de manche.',
    },
  },
  {
    counts: { 2: 1, 3: 2, 4: 3 },
    card: {
      templateId: 'BLD_PORT',
      name: 'Port de Commerce',
      category: 'BUILDING',
      cost: { WOOD: 2 },
      allowedTerrains: ['SEA'],
      power: 1,
      victoryPoints: 0,
      description: '+1 Puissance. Relie entre elles toutes vos Cités possédant un Port.',
    },
  },
  {
    counts: { 2: 1, 3: 1, 4: 2 },
    card: {
      templateId: 'BLD_AQUEDUCT',
      name: 'Aqueduc',
      category: 'BUILDING',
      cost: { CLAY: 2, MARBLE: 1 },
      allowedTerrains: ['RIVER'],
      power: 1,
      victoryPoints: 0,
      producedResource: 'WHEAT',
      description: '+1 Puissance (+2 si adjacent à une Plaine) et produit +1 Blé.',
    },
  },
  {
    counts: { 2: 1, 3: 2, 4: 2 },
    card: {
      templateId: 'BLD_GOLDSMITH',
      name: "Atelier d'Orfèvre",
      category: 'BUILDING',
      cost: { BRONZE: 1, MARBLE: 1, drachmas: 3 },
      allowedTerrains: ['MOUNTAIN_MARBLE', 'MOUNTAIN_BRONZE', 'RIVER'],
      power: 1,
      victoryPoints: 0,
      producedResource: 'SACRED_GOLD',
      description: '+1 Puissance et produit la ressource rare permanente Or Sacré.',
    },
  },
  {
    counts: { 2: 1, 3: 1, 4: 2 },
    card: {
      templateId: 'BLD_WAREHOUSE',
      name: 'Entrepôt Fortifié',
      category: 'BUILDING',
      cost: { WOOD: 1, BRONZE: 1 },
      allowedTerrains: ['PLAINS', 'FOREST', 'RIVER', 'MOUNTAIN_MARBLE', 'MOUNTAIN_BRONZE'],
      power: 1,
      victoryPoints: 0,
      description: '+1 Puissance. Permet de garder gratuitement 2 cartes en Chantier en fin de manche.',
    },
  },

  // --- RESSOURCES SPÉCIALES MARRON (6 / 9 / 12) ---
  {
    counts: { 2: 2, 3: 2, 4: 3 },
    card: {
      templateId: 'BRN_VINEYARD',
      name: 'Vignoble de Némée',
      category: 'SPECIAL_RESOURCE',
      cost: {},
      power: 0,
      victoryPoints: 0,
      durationTurns: 3,
      producedResource: 'VINE',
      description: 'Ajoute la ressource Vigne à une case contrôlée pendant 3 tours.',
    },
  },
  {
    counts: { 2: 1, 3: 2, 4: 3 },
    card: {
      templateId: 'BRN_GOLD_VEIN',
      name: "Filon d'Or Sacré",
      category: 'SPECIAL_RESOURCE',
      cost: { drachmas: 2 },
      power: 0,
      victoryPoints: 0,
      durationTurns: 3,
      producedResource: 'SACRED_GOLD',
      description: 'Ajoute la ressource Or Sacré à une case contrôlée pendant 3 tours.',
    },
  },
  {
    counts: { 2: 1, 3: 2, 4: 2 },
    card: {
      templateId: 'BRN_FESTIVAL',
      name: 'Festival Panhellénique',
      category: 'SPECIAL_RESOURCE',
      cost: { drachmas: 2 },
      power: 2,
      victoryPoints: 0,
      durationTurns: 2,
      description: 'Ajoute +2 Puissance temporaire à une case contrôlée pendant 2 tours.',
    },
  },
  {
    counts: { 2: 1, 3: 2, 4: 2 },
    card: {
      templateId: 'BRN_CARAVAN',
      name: 'Caravane de Mécènes',
      category: 'SPECIAL_RESOURCE',
      cost: {},
      power: 0,
      victoryPoints: 0,
      durationTurns: 4,
      producedResource: 'ANY_BASE',
      description: 'Produit 1 ressource de base Joker pendant 4 tours.',
    },
  },
  {
    counts: { 2: 1, 3: 1, 4: 2 },
    card: {
      templateId: 'BRN_NYMPHS',
      name: 'Bénédiction des Nymphes',
      category: 'SPECIAL_RESOURCE',
      cost: { drachmas: 1 },
      power: 0,
      victoryPoints: 0,
      durationTurns: 4,
      description: 'Immunise la case contre les Malus et rapporte +1 Drachme/tour pendant 4 tours.',
    },
  },

  // --- HABITANTS IVOIRE (3 / 6 / 10) ---
  {
    counts: { 2: 1, 3: 1, 4: 1 },
    card: {
      templateId: 'INH_01',
      name: 'Architecte de Corinthe',
      category: 'INHABITANT',
      cost: { MARBLE: 1, drachmas: 2 },
      power: 0,
      victoryPoints: 3,
      description: '-2 Drachmes sur le coût des Grands Temples. +3 PV finaux.',
    },
  },
  {
    counts: { 2: 1, 3: 1, 4: 1 },
    card: {
      templateId: 'INH_02',
      name: 'Marchand Phénicien',
      category: 'INHABITANT',
      cost: { FISH: 1, drachmas: 2 },
      power: 0,
      victoryPoints: 2,
      description: 'Le commerce avec la Banque coûte 2 Drachmes au lieu de 3. +2 PV finaux.',
    },
  },
  {
    counts: { 2: 1, 3: 1, 4: 1 },
    card: {
      templateId: 'INH_03',
      name: 'Philosophe Stoïcien',
      category: 'INHABITANT',
      cost: { CLAY: 1, drachmas: 2 },
      power: 0,
      victoryPoints: 0,
      description: '+1 PV par Bâtiment ou Dieu dans votre plus grande Cité.',
    },
  },
  {
    counts: { 2: 0, 3: 1, 4: 1 },
    card: {
      templateId: 'INH_04',
      name: 'Grand Prêtre de Delphes',
      category: 'INHABITANT',
      cost: { MARBLE: 1, drachmas: 3 },
      power: 0,
      victoryPoints: 0,
      description: '+2 Faveur Divine immédiate et +2 PV finaux par Temple possédé.',
    },
  },
  {
    counts: { 2: 0, 3: 1, 4: 1 },
    card: {
      templateId: 'INH_05',
      name: 'Stratège Spartiate',
      category: 'INHABITANT',
      cost: { BRONZE: 1, WHEAT: 1 },
      power: 0,
      victoryPoints: 4,
      description: 'Vous ne pouvez subir qu’un seul Malus par manche maximum. +4 PV finaux.',
    },
  },
  {
    counts: { 2: 0, 3: 1, 4: 1 },
    card: {
      templateId: 'INH_06',
      name: 'Ingénieur Agronome',
      category: 'INHABITANT',
      cost: { WOOD: 1, WHEAT: 1 },
      power: 0,
      victoryPoints: 0,
      description: '+2 PV finaux par case Plaine et Rivière contrôlée.',
    },
  },
  {
    counts: { 2: 0, 3: 0, 4: 1 },
    card: {
      templateId: 'INH_07',
      name: 'Maître Carrier',
      category: 'INHABITANT',
      cost: { WOOD: 1, BRONZE: 1 },
      power: 0,
      victoryPoints: 0,
      description: '+2 PV finaux par case Montagne contrôlée.',
    },
  },
  {
    counts: { 2: 0, 3: 0, 4: 1 },
    card: {
      templateId: 'INH_08',
      name: 'Amiral Athénien',
      category: 'INHABITANT',
      cost: { WOOD: 1, FISH: 1 },
      power: 0,
      victoryPoints: 0,
      description: '+2 PV finaux par case Mer contrôlée.',
    },
  },
  {
    counts: { 2: 0, 3: 0, 4: 1 },
    card: {
      templateId: 'INH_09',
      name: 'Contremaître Royal',
      category: 'INHABITANT',
      cost: { drachmas: 3 },
      power: 0,
      victoryPoints: 3,
      description: 'Conserver une carte en Chantier en fin de manche coûte 2 Drachmes au lieu de 5. +3 PV.',
    },
  },
  {
    counts: { 2: 0, 3: 0, 4: 1 },
    card: {
      templateId: 'INH_10',
      name: 'Mécène Olympique',
      category: 'INHABITANT',
      cost: { drachmas: 5 },
      power: 0,
      victoryPoints: 0,
      description: '+1 PV par tranche de 2 Drachmes restantes en fin de partie (au lieu de 5).',
    },
  },

  // --- BONUS BLANCS (2 / 4 / 6) ---
  {
    counts: { 2: 1, 3: 2, 4: 2 },
    card: {
      templateId: 'BON_CROESUS',
      name: 'Trésor de Crésus',
      category: 'BONUS',
      cost: {},
      power: 0,
      victoryPoints: 0,
      description: 'Gagnez immédiatement +6 Drachmes.',
    },
  },
  {
    counts: { 2: 1, 3: 1, 4: 2 },
    card: {
      templateId: 'BON_CHRONOS',
      name: 'Souffle de Chronos',
      category: 'BONUS',
      cost: {},
      power: 0,
      victoryPoints: 0,
      description: 'Ajoute +3 tours de durée à toutes vos cartes Marron actives.',
    },
  },
  {
    counts: { 2: 0, 3: 1, 4: 2 },
    card: {
      templateId: 'BON_ORACLE',
      name: 'Oracle Favorable',
      category: 'BONUS',
      cost: {},
      power: 0,
      victoryPoints: 0,
      description: 'Gagnez immédiatement +2 Faveur Divine et +3 Drachmes.',
    },
  },

  // --- MALUS ROUGES (4 / 8 / 12) ---
  {
    counts: { 2: 2, 3: 3, 4: 4 },
    card: {
      templateId: 'MAL_HERMES_PLUNDER',
      name: "Pillage d'Hermès",
      category: 'MALUS',
      cost: {},
      power: 0,
      victoryPoints: 0,
      description: 'Capturez la production d’une case adverse pour votre tour en cours (+1 Faveur à la cible).',
    },
  },
  {
    counts: { 2: 1, 3: 2, 4: 3 },
    card: {
      templateId: 'MAL_PIRATE_RAID',
      name: 'Raid des Pirates Égéens',
      category: 'MALUS',
      cost: { drachmas: 2 },
      power: 0,
      victoryPoints: 0,
      description: 'Capturez 2 ressources d’un adversaire pour votre tour en cours (+1 Faveur à la cible).',
    },
  },
  {
    counts: { 2: 1, 3: 2, 4: 2 },
    card: {
      templateId: 'MAL_CORINTH_TAX',
      name: 'Taxe de Corinthe',
      category: 'MALUS',
      cost: {},
      power: 0,
      victoryPoints: 0,
      description: 'Volez jusqu’à 3 Drachmes à un adversaire ciblé (+1 Faveur à la cible).',
    },
  },
  {
    counts: { 2: 0, 3: 1, 4: 2 },
    card: {
      templateId: 'MAL_TITAN_LANDSLIDE',
      name: 'Éboulement des Titans',
      category: 'MALUS',
      cost: {},
      power: 0,
      victoryPoints: 0,
      description: 'Réduit de -2 tours les cartes Marron d’une case adverse (+1 Faveur à la cible).',
    },
  },
  {
    counts: { 2: 0, 3: 0, 4: 1 },
    card: {
      templateId: 'MAL_OLYMPUS_WRATH',
      name: "Courroux de l'Olympe (Global)",
      category: 'MALUS',
      cost: {},
      power: 0,
      victoryPoints: 0,
      description: 'Tous les adversaires perdent 2 Drachmes.',
    },
  },
];

const TERRAIN_NAMES: Record<TerrainType, string> = {
  PLAINS: 'Plaine Fertile (Blé)',
  FOREST: 'Forêt de Cyprès (Bois)',
  RIVER: 'Vallée Fluviale (Argile)',
  MOUNTAIN_MARBLE: 'Montagne de Paros (Marbre)',
  MOUNTAIN_BRONZE: 'Montagne Métallifère (Bronze)',
  SEA: 'Côte Égéenne (Poisson + 1 Dr.)',
  SANCTUARY: "Sanctuaire de l'Olympe (+1 Puiss.)",
};

/**
 * Construit le paquet complet et mélangé de 72 (2J), 108 (3J) ou 144 (4J) cartes.
 */
export function buildScaledDeck(tiles: HexTile[], playerCount: 2 | 3 | 4): {
  allCardsMap: Record<string, CardDefinition>;
  shuffledDeckIds: string[];
} {
  const cards: CardDefinition[] = [];

  // 1. Cartes Emplacement / Terrain (40 / 55 / 70)
  tiles.forEach((tile, idx) => {
    cards.push({
      id: `TER_${idx + 1}_${tile.coord}`,
      templateId: `TER_${tile.terrain}`,
      name: `${tile.coord} — ${TERRAIN_NAMES[tile.terrain]}`,
      category: 'TERRITORY',
      minPlayers: 2,
      cost: {},
      targetCoord: tile.coord,
      power: tile.terrain === 'SANCTUARY' ? 1 : 0,
      victoryPoints: 0,
      description: `Prenez le contrôle de l'hexagone ${tile.coord}.`,
    });
  });

  // 2. Cartes Dieux Secondaires (5 pour 2J, 8 pour 3J, 10 pour 4J)
  const godsLimit = playerCount === 2 ? 5 : playerCount === 3 ? 8 : 10;
  SECONDARY_GODS_TEMPLATES.slice(0, godsLimit).forEach((god) => {
    cards.push({
      ...god,
      id: god.templateId,
    });
  });

  // 3. Toutes les autres catégories scalées
  let serial = 1;
  for (const item of SCALED_TEMPLATES) {
    const qty = item.counts[playerCount];
    for (let i = 0; i < qty; i++) {
      cards.push({
        ...item.card,
        id: `${item.card.templateId}_${serial++}`,
        minPlayers: playerCount,
      });
    }
  }

  // Mélange Fisher-Yates
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const allCardsMap: Record<string, CardDefinition> = {};
  for (const c of cards) {
    allCardsMap[c.id] = c;
  }

  return {
    allCardsMap,
    shuffledDeckIds: shuffled.map((c) => c.id),
  };
}
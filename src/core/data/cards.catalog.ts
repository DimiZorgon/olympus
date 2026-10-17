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
    secondaryTerrains: [],
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
    description: '+3 Puissance, +10 PV finaux, immunise sa Cité contre les Malus.',
  },
};

export const CAPRICES_CATALOG: CapriceDefinition[] = [
  { id: 'CAP_01', name: "Âge d'Or d'Apollon", description: 'Cités +1 Puissance, mais la Banque coûte +1 Drachme.' },
  { id: 'CAP_02', name: 'Trêve Olympique', description: 'Malus offensifs désactivés (+4 Drachmes si défaussés).' },
  { id: 'CAP_03', name: 'Fièvre Architecturale', description: '+2 PV bonus par bâtiment construit au Tour 6.' },
  { id: 'CAP_04', name: 'Abondance de Déméter', description: 'Vigne et Or Sacré comptent double lors de la récolte.' },
];

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
    bonusText: '+2 PV par bâtiment civil adjacent.',
    malusText: "-3 PV si adjacent à Arès.",
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
    bonusText: '+2 Drachmes si au moins 2 cases voisines sont sans bâtiment.',
    malusText: '-1 Puissance par bâtiment adjacent.',
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
    description: 'Produit 1 Vigne/Gibier permanent.',
    bonusText: '+2 PV par Forêt dans la Cité.',
    malusText: '-2 PV par Plaine adjacente.',
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
    bonusText: '+2 PV par case ennemie adjacente.',
    malusText: 'Banque coûte +1 Drachme.',
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
    bonusText: '-1 ressource au choix sur vos futurs bâtiments.',
    malusText: 'Cases Forêt et Plaine adjacentes polluées.',
  },
  {
    templateId: 'GOD_06',
    name: "Temple d'Hermès",
    category: 'SECONDARY_GOD',
    minPlayers: 2,
    cost: { WOOD: 1, CLAY: 1, drachmas: 3 },
    allowedTerrains: ['SEA', 'RIVER'],
    power: 1,
    victoryPoints: 2,
    description: '+1 Puissance, +2 PV.',
    bonusText: 'Banque à 1 Drachme + 3 Drachmes/manche.',
    malusText: '-4 PV si la Cité fait moins de 3 cases.',
  },
  {
    templateId: 'GOD_07',
    name: 'Temple de Déméter',
    category: 'SECONDARY_GOD',
    minPlayers: 2,
    cost: { WHEAT: 2, CLAY: 1 },
    allowedTerrains: ['PLAINS', 'RIVER'],
    power: 2,
    victoryPoints: 4,
    description: '+4 PV finaux.',
    bonusText: '+1 Puissance par Plaine dans la Cité.',
    malusText: '-1 Puissance si adjacent à une Montagne.',
  },
  {
    templateId: 'GOD_08',
    name: "Temple d'Aphrodite",
    category: 'SECONDARY_GOD',
    minPlayers: 2,
    cost: { MARBLE: 1, FISH: 1, drachmas: 3 },
    allowedTerrains: ['SEA', 'SANCTUARY'],
    power: 2,
    victoryPoints: 2,
    description: '+2 Faveur Divine immédiate.',
    bonusText: '+2 PV par Habitant possédé.',
    malusText: "-5 PV si même Cité qu'Héra ou Athéna.",
  },
  {
    templateId: 'GOD_09',
    name: 'Temple de Dionysos',
    category: 'SECONDARY_GOD',
    minPlayers: 2,
    cost: { WOOD: 1, WHEAT: 1, CLAY: 1 },
    allowedTerrains: ['PLAINS', 'FOREST'],
    power: 2,
    victoryPoints: 3,
    producedResource: 'VINE',
    description: 'Produit la ressource exotique Vigne.',
    bonusText: '+1 type rare pour le multiplicateur.',
    malusText: 'Bâtiments adjacents perdent -1 Puissance.',
  },
  {
    templateId: 'GOD_10',
    name: "Temple d'Héra",
    category: 'SECONDARY_GOD',
    minPlayers: 2,
    cost: { MARBLE: 2, WHEAT: 1, drachmas: 3 },
    allowedTerrains: ['SANCTUARY', 'MOUNTAIN_MARBLE', 'MOUNTAIN_BRONZE'],
    power: 3,
    victoryPoints: 6,
    description: '+3 Puissance, +6 PV.',
    bonusText: 'Passe à +12 PV avec Zeus.',
    malusText: '-5 Drachmes sans Grand Temple en fin de partie.',
  },
];

const ACTION_CARDS_TEMPLATES: Array<{ count: number; card: Omit<CardDefinition, 'id' | 'minPlayers'> }> = [
  // BÂTIMENTS CIVILS
  { count: 6, card: { templateId: 'BLD_WATCHTOWER', name: 'Tour de Garde (Acropole I)', category: 'BUILDING', cost: { WOOD: 1, CLAY: 1 }, power: 1, victoryPoints: 0, description: '+1 Puissance pour la Cité.' } },
  { count: 5, card: { templateId: 'BLD_CITADEL', name: 'Citadelle Grecque (Acropole II)', category: 'BUILDING', cost: { MARBLE: 1, WOOD: 1, BRONZE: 1 }, allowedTerrains: ['MOUNTAIN_MARBLE', 'MOUNTAIN_BRONZE', 'PLAINS'], power: 2, victoryPoints: 0, description: '+2 Puissance pour la Cité.' } },
  { count: 4, card: { templateId: 'BLD_PARTHENON', name: 'Parthénon Civique (Acropole III)', category: 'BUILDING', cost: { MARBLE: 2, BRONZE: 1, WOOD: 1 }, allowedTerrains: ['MOUNTAIN_MARBLE', 'MOUNTAIN_BRONZE'], power: 3, victoryPoints: 0, description: '+3 Puissance pour la Cité.' } },
  { count: 4, card: { templateId: 'BLD_AGORA', name: 'Agora (Marché)', category: 'BUILDING', cost: { WOOD: 1, WHEAT: 1 }, allowedTerrains: ['PLAINS', 'RIVER'], power: 1, victoryPoints: 0, description: '+1 Puissance et +3 Drachmes par manche.' } },
  { count: 4, card: { templateId: 'BLD_PORT', name: 'Port de Commerce', category: 'BUILDING', cost: { WOOD: 2 }, allowedTerrains: ['SEA'], power: 1, victoryPoints: 0, description: '+1 Puissance. Relie vos Cités côtières entre elles.' } },
  { count: 3, card: { templateId: 'BLD_AQUEDUCT', name: 'Aqueduc', category: 'BUILDING', cost: { CLAY: 2, MARBLE: 1 }, allowedTerrains: ['RIVER'], power: 1, victoryPoints: 0, producedResource: 'WHEAT', description: '+1 Puissance (+2 si adjacent Plaine) et produit 1 Blé.' } },
  { count: 3, card: { templateId: 'BLD_GOLDSMITH', name: "Atelier d'Orfèvre", category: 'BUILDING', cost: { BRONZE: 1, MARBLE: 1, drachmas: 3 }, allowedTerrains: ['MOUNTAIN_MARBLE', 'MOUNTAIN_BRONZE', 'RIVER'], power: 1, victoryPoints: 0, producedResource: 'SACRED_GOLD', description: '+1 Puissance et produit Or Sacré.' } },
  { count: 3, card: { templateId: 'BLD_WAREHOUSE', name: 'Entrepôt Fortifié', category: 'BUILDING', cost: { WOOD: 1, BRONZE: 1 }, power: 1, victoryPoints: 0, description: '+1 Puissance. Conserve 2 cartes en Chantier gratuitement.' } },

  // RESSOURCES MARRON
  { count: 4, card: { templateId: 'BRN_VINEYARD', name: 'Vignoble de Némée', category: 'SPECIAL_RESOURCE', cost: {}, power: 0, victoryPoints: 0, durationTurns: 3, producedResource: 'VINE', description: 'Ajoute la ressource Vigne à la case pendant 3 tours.' } },
  { count: 4, card: { templateId: 'BRN_GOLD_VEIN', name: "Filon d'Or Sacré", category: 'SPECIAL_RESOURCE', cost: { drachmas: 2 }, power: 0, victoryPoints: 0, durationTurns: 3, producedResource: 'SACRED_GOLD', description: 'Ajoute la ressource Or Sacré à la case pendant 3 tours.' } },
  { count: 4, card: { templateId: 'BRN_FESTIVAL', name: 'Festival Panhellénique', category: 'SPECIAL_RESOURCE', cost: { drachmas: 2 }, power: 2, victoryPoints: 0, durationTurns: 2, description: 'Ajoute +2 Puissance temporaire à la case pendant 2 tours.' } },
  { count: 3, card: { templateId: 'BRN_CARAVAN', name: 'Caravane de Mécènes', category: 'SPECIAL_RESOURCE', cost: {}, power: 0, victoryPoints: 0, durationTurns: 4, producedResource: 'ANY_BASE', description: 'Produit 1 ressource Joker pendant 4 tours.' } },
  { count: 3, card: { templateId: 'BRN_NYMPHS', name: 'Bénédiction des Nymphes', category: 'SPECIAL_RESOURCE', cost: { drachmas: 1 }, power: 0, victoryPoints: 0, durationTurns: 4, description: 'Immunise la case et rapporte +1 Drachme/tour pendant 4 tours.' } },

  // HABITANTS
  { count: 2, card: { templateId: 'INH_01', name: 'Architecte de Corinthe', category: 'INHABITANT', cost: { MARBLE: 1, drachmas: 2 }, power: 0, victoryPoints: 3, description: '-2 Drachmes sur Grands Temples. +3 PV finaux.' } },
  { count: 2, card: { templateId: 'INH_02', name: 'Marchand Phénicien', category: 'INHABITANT', cost: { FISH: 1, drachmas: 2 }, power: 0, victoryPoints: 2, description: 'Banque à 2 Drachmes au lieu de 3. +2 PV finaux.' } },
  { count: 2, card: { templateId: 'INH_03', name: 'Philosophe Stoïcien', category: 'INHABITANT', cost: { CLAY: 1, drachmas: 2 }, power: 0, victoryPoints: 0, description: '+1 PV par Bâtiment/Dieu dans votre plus grande Cité.' } },
  { count: 2, card: { templateId: 'INH_04', name: 'Grand Prêtre de Delphes', category: 'INHABITANT', cost: { MARBLE: 1, drachmas: 3 }, power: 0, victoryPoints: 0, description: '+2 Faveur immédiate et +2 PV par Temple possédé.' } },
  { count: 2, card: { templateId: 'INH_05', name: 'Stratège Spartiate', category: 'INHABITANT', cost: { BRONZE: 1, WHEAT: 1 }, power: 0, victoryPoints: 4, description: 'Max 1 seul Malus subi par manche. +4 PV finaux.' } },
  { count: 2, card: { templateId: 'INH_06', name: 'Ingénieur Agronome', category: 'INHABITANT', cost: { WOOD: 1, WHEAT: 1 }, power: 0, victoryPoints: 0, description: '+2 PV finaux par Plaine et Rivière contrôlée.' } },
  { count: 2, card: { templateId: 'INH_07', name: 'Maître Carrier', category: 'INHABITANT', cost: { WOOD: 1, BRONZE: 1 }, power: 0, victoryPoints: 0, description: '+2 PV finaux par case Montagne contrôlée.' } },
  { count: 2, card: { templateId: 'INH_08', name: 'Amiral Athénien', category: 'INHABITANT', cost: { WOOD: 1, FISH: 1 }, power: 0, victoryPoints: 0, description: '+2 PV finaux par case Mer contrôlée.' } },
  { count: 2, card: { templateId: 'INH_09', name: 'Contremaître Royal', category: 'INHABITANT', cost: { drachmas: 3 }, power: 0, victoryPoints: 3, description: 'Garder une carte en Chantier coûte 2 Dr. au lieu de 5. +3 PV.' } },
  { count: 2, card: { templateId: 'INH_10', name: 'Mécène Olympique', category: 'INHABITANT', cost: { drachmas: 5 }, power: 0, victoryPoints: 0, description: '+1 PV par tranche de 2 Drachmes en fin de partie.' } },

  // BONUS & MALUS
  { count: 3, card: { templateId: 'BON_CROESUS', name: 'Trésor de Crésus', category: 'BONUS', cost: {}, power: 0, victoryPoints: 0, description: 'Gagnez immédiatement +6 Drachmes.' } },
  { count: 3, card: { templateId: 'BON_CHRONOS', name: 'Souffle de Chronos', category: 'BONUS', cost: {}, power: 0, victoryPoints: 0, description: '+3 tours de durée sur vos cartes Marron actives.' } },
  { count: 3, card: { templateId: 'BON_ORACLE', name: 'Oracle Favorable', category: 'BONUS', cost: {}, power: 0, victoryPoints: 0, description: '+2 Faveur Divine et +3 Drachmes.' } },
  { count: 4, card: { templateId: 'MAL_HERMES_PLUNDER', name: "Pillage d'Hermès", category: 'MALUS', cost: {}, power: 0, victoryPoints: 0, description: 'Capture la ressource d’une case adverse ce tour (+1 Faveur cible).' } },
  { count: 3, card: { templateId: 'MAL_PIRATE_RAID', name: 'Raid des Pirates Égéens', category: 'MALUS', cost: { drachmas: 2 }, power: 0, victoryPoints: 0, description: 'Capture 2 ressources d’un adversaire ce tour (+1 Faveur cible).' } },
  { count: 3, card: { templateId: 'MAL_CORINTH_TAX', name: 'Taxe de Corinthe', category: 'MALUS', cost: {}, power: 0, victoryPoints: 0, description: 'Vole jusqu’à 3 Drachmes à un adversaire (+1 Faveur cible).' } },
  { count: 2, card: { templateId: 'MAL_TITAN_LANDSLIDE', name: 'Éboulement des Titans', category: 'MALUS', cost: {}, power: 0, victoryPoints: 0, description: '-2 tours sur les cartes Marron d’une case adverse (+1 Faveur cible).' } },
  { count: 1, card: { templateId: 'MAL_OLYMPUS_WRATH', name: "Courroux de l'Olympe", category: 'MALUS', cost: {}, power: 0, victoryPoints: 0, description: 'Tous les adversaires perdent 2 Drachmes.' } },
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
 * Construit le deck complet (100 Territoires + 92 Actions/Bâtiments = 192 cartes)
 */
export function buildScaledDeck(tiles: HexTile[], playerCount: 2 | 3 | 4 = 4): {
  allCardsMap: Record<string, CardDefinition>;
  shuffledDeckIds: string[];
} {
  const cards: CardDefinition[] = [];

  // 1. Les 100 cartes Territoire
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

  // 2. Les 10 Dieux Secondaires
  SECONDARY_GODS_TEMPLATES.forEach((god) => {
    cards.push({ ...god, id: god.templateId });
  });

  // 3. Les 82 autres cartes d'action
  let serial = 1;
  for (const item of ACTION_CARDS_TEMPLATES) {
    for (let i = 0; i < item.count; i++) {
      cards.push({
        ...item.card,
        id: `${item.card.templateId}_${serial++}`,
        minPlayers: 2,
      });
    }
  }

  // Mélange aléatoire intégral (Fisher-Yates)
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
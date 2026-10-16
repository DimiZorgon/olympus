// src/core/types/game.types.ts

export type TerrainType =
  | 'PLAINS'          // Produit 1 Blé
  | 'FOREST'          // Produit 1 Bois
  | 'RIVER'           // Produit 1 Argile
  | 'MOUNTAIN_MARBLE' // Produit 1 Marbre
  | 'MOUNTAIN_BRONZE' // Produit 1 Bronze
  | 'SEA'             // Produit 1 Poisson (+1 Drachme à la pose)
  | 'SANCTUARY';      // +1 Puissance native, réservé aux Temples

export type ResourceType =
  | 'WHEAT'
  | 'WOOD'
  | 'CLAY'
  | 'MARBLE'
  | 'BRONZE'
  | 'FISH'
  | 'VINE'         // Ressource exotique
  | 'SACRED_GOLD'  // Ressource exotique
  | 'ANY_BASE';    // Joker (Caravane de Mécènes)

export type CardCategory =
  | 'TERRITORY'        // Verte
  | 'BUILDING'         // Bleue
  | 'SECONDARY_GOD'    // Violette/Or
  | 'SPECIAL_RESOURCE' // Marron (temporaire)
  | 'INHABITANT'       // Ivoire
  | 'BONUS'            // Blanche
  | 'MALUS';           // Rouge/Noire

export type MajorGodId = 'ZEUS' | 'POSEIDON' | 'HADES';

export type ResourceCost = Partial<Record<Exclude<ResourceType, 'ANY_BASE'>, number>> & {
  drachmas?: number;
};

export interface CardDefinition {
  id: string;
  templateId: string;
  name: string;
  category: CardCategory;
  minPlayers: 2 | 3 | 4;
  cost: ResourceCost;
  allowedTerrains?: TerrainType[];
  targetCoord?: string; // Uniquement pour les cartes TERRITORY
  power: number;        // Puissance ajoutée à la Cité pour la Récolte
  victoryPoints: number;// PV fixes de fin de partie
  durationTurns?: number; // Uniquement pour SPECIAL_RESOURCE (Marron)
  producedResource?: ResourceType;
  description: string;
  bonusText?: string;
  malusText?: string;
}

export interface MajorGodDefinition {
  id: MajorGodId;
  name: string;
  minPlayers: 2 | 3 | 4;
  cost: ResourceCost;
  power: number;
  victoryPoints: number;
  primaryTerrains: TerrainType[];
  secondaryTerrains: TerrainType[]; // Si vide = n'importe quel hexagone adjacent
  description: string;
}

export interface CapriceDefinition {
  id: string;
  name: string;
  description: string;
}

export interface ActiveBrownBuff {
  cardId: string;
  templateId: string;
  name: string;
  remainingTurns: number;
  addedResource?: ResourceType;
  addedPower?: number;
  isImmuneToMalus?: boolean;
  drachmasPerTurn?: number;
}

export interface HexTile {
  coord: string; // Ex: "A1", "D5"
  q: number;
  r: number;
  terrain: TerrainType;
  ownerId: string | null;
  disabledNextTurn?: boolean; // Éboulement des Titans
  building: {
    cardId: string;
    templateId: string;
    name: string;
    category: 'BUILDING' | 'SECONDARY_GOD' | 'MAJOR_GOD';
    power: number;
    linkedCoord?: string; // Pour les Grands Temples bi-cases
    isSecondaryHalf?: boolean;
  } | null;
  activeBrownBuffs: ActiveBrownBuff[];
}

export interface PlayerPublicState {
  id: string;
  name: string;
  isBot: boolean;
  isAfk: boolean;
  drachmas: number;
  olympusFavor: number; // 100% public, sert à départager les Grands Temples
  scoreHistory: number[]; // Scores des manches 1, 2, 3
  totalScore: number;
  reserveCount: number;
  inhabitants: string[]; // IDs des cartes INHABITANT actives
  malusesUsedOnMeThisRound: number;
  isReady: boolean;
}

export interface TurnActionCommand {
  cardId: string;
  source: 'HAND' | 'RESERVE' | 'MAJOR_GOD';
  actionType:
    | 'CLAIM_TERRITORY'
    | 'BUILD_ON_TILE'
    | 'PLAY_INHABITANT'
    | 'MOVE_TO_RESERVE'
    | 'DISCARD_FOR_DRACHMAS'
    | 'PLAY_BONUS'
    | 'PLAY_MALUS'
    | 'CLAIM_MAJOR_GOD';
  targetCoord?: string;
  secondaryTargetCoord?: string; // 2e case pour Zeus/Poséidon/Hadès
  targetPlayerId?: string;
  capturedResourceChoice?: Exclude<ResourceType, 'ANY_BASE'>;
  secondCapturedResourceChoice?: Exclude<ResourceType, 'ANY_BASE'>;
}

export interface EndOfRoundReserveDecision {
  cardId: string;
  decision: 'KEEP_PAY_DRACHMAS' | 'BURN';
}

export interface TurnSubmission {
  playerId: string;
  pickedFromHand: [string, string]; // Les 2 cartes choisies dans l'éventail
  commands: TurnActionCommand[];
  reserveCleanupDecisions?: EndOfRoundReserveDecision[]; // Requis au Tour 6
}

export interface MajorGodState {
  available: boolean;
  ownerId: string | null;
  coords: [string, string] | null;
}

export interface GamePublicState {
  id: string;
  room_code: string;
  status: 'LOBBY' | 'IN_PROGRESS' | 'FINISHED';
  player_count: 2 | 3 | 4;
  current_round: 1 | 2 | 3;
  current_turn: 1 | 2 | 3 | 4 | 5 | 6;
  enable_caprice_r3: boolean;
  active_caprice_id: string | null;
  major_gods_state: Record<MajorGodId, MajorGodState>;
  board_tiles: HexTile[];
  players_public: Record<string, PlayerPublicState>;
}
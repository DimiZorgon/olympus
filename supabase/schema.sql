-- Schema SQL Olympus pour Supabase SQL Editor

CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  player_count INT NOT NULL DEFAULT 2,
  current_round INT NOT NULL DEFAULT 1,
  current_turn INT NOT NULL DEFAULT 1,
  enable_caprice_r3 BOOLEAN NOT NULL DEFAULT true,
  active_caprice_id TEXT,
  major_gods_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  board_tiles JSONB NOT NULL DEFAULT '[]'::jsonb,
  players_public JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  round_2_cards JSONB NOT NULL DEFAULT '{}'::jsonb,
  round_3_cards JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS player_private_hands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  is_bot BOOLEAN NOT NULL DEFAULT false,
  hand_card_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  reserve_card_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  pending_submission JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_turn_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  round INT NOT NULL,
  turn INT NOT NULL,
  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Activation RLS & politiques d'accès
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_private_hands ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_turn_logs ENABLE ROW LEVEL SECURITY;

-- Lecture publique pour les salons
CREATE POLICY "Lecture publique games" ON games FOR SELECT USING (true);
CREATE POLICY "Lecture publique logs" ON game_turn_logs FOR SELECT USING (true);
CREATE POLICY "Lecture publique hands" ON player_private_hands FOR SELECT USING (true);

-- Le rôle service_role (Admin) dispose d'un accès total automatique (BYPASSRLS).


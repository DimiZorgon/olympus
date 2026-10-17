// src/app/api/game/create/route.ts
import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { generateProceduralIsland } from '@/core/map/IslandGenerator';
import { buildScaledDeck } from '@/core/data/cards.catalog';
import { MajorGodId, MajorGodState, PlayerPublicState } from '@/core/types/game.types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const playerCount: 2 | 3 | 4 = body.playerCount || 2;
    const humanPlayerId: string = body.playerId || crypto.randomUUID();
    const humanName: string = body.playerName || 'Architecte';
    const enableCapriceR3: boolean = body.enableCapriceR3 ?? true;

    const supabase = createAdminSupabaseClient();

    // 1. Générer l'île procédurale (40, 55 ou 70 tuiles)
    const tiles = generateProceduralIsland(playerCount);

    // 2. Récupérer les modèles de cartes depuis Supabase (table card_templates)
    const { data: dbTemplates, error: templatesErr } = await supabase
      .from('card_templates')
      .select('*');

    if (templatesErr) {
      console.warn('Erreur lecture card_templates Supabase, utilisation repli :', templatesErr.message);
    }

    // 3. Générer le paquet de cartes exact (72, 108 ou 144 cartes)
    const { allCardsMap, shuffledDeckIds } = buildScaledDeck(
      tiles,
      playerCount,
      dbTemplates && dbTemplates.length > 0 ? dbTemplates : undefined
    );

    // 3. Initialiser les Dieux Majeurs selon le nombre de joueurs
    const majorGods: Record<MajorGodId, MajorGodState> = {
      ZEUS: { available: true, ownerId: null, coords: null },
      POSEIDON: { available: playerCount >= 3, ownerId: null, coords: null },
      HADES: { available: playerCount === 4, ownerId: null, coords: null },
    };

    // 4. Créer le joueur humain + remplir le reste avec des Bots
    const playersPublic: Record<string, PlayerPublicState> = {};
    const playerIds: string[] = [humanPlayerId];

    playersPublic[humanPlayerId] = {
      id: humanPlayerId,
      name: humanName,
      isBot: false,
      isAfk: false,
      drachmas: 10,
      olympusFavor: 0,
      scoreHistory: [],
      totalScore: 0,
      reserveCount: 0,
      inhabitants: [],
      malusesUsedOnMeThisRound: 0,
      isReady: false,
    };

    for (let i = 2; i <= playerCount; i++) {
      const botId = crypto.randomUUID();
      playerIds.push(botId);
      playersPublic[botId] = {
        id: botId,
        name: `Automate Olympien #${i - 1}`,
        isBot: true,
        isAfk: false,
        drachmas: 10,
        olympusFavor: 0,
        scoreHistory: [],
        totalScore: 0,
        reserveCount: 0,
        inhabitants: [],
        malusesUsedOnMeThisRound: 0,
        isReady: false,
      };
    }

    const cardsPerRound = playerCount * 12;
    const round1Ids = shuffledDeckIds.slice(0, cardsPerRound);
    const round2Ids = shuffledDeckIds.slice(cardsPerRound, cardsPerRound * 2);
    const round3Ids = shuffledDeckIds.slice(cardsPerRound * 2, cardsPerRound * 3);

    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data: gameRow, error: gameErr } = await supabase
      .from('games')
      .insert({
        room_code: roomCode,
        status: 'IN_PROGRESS',
        player_count: playerCount,
        current_round: 1,
        current_turn: 1,
        enable_caprice_r3: enableCapriceR3,
        major_gods_state: majorGods,
        board_tiles: tiles,
        players_public: playersPublic,
      })
      .select()
      .single();

    if (gameErr) throw gameErr;

    // Stocker le catalogue et les pioches des manches 2 et 3 côté serveur
    await supabase.from('game_decks').insert({
      game_id: gameRow.id,
      round_2_cards: { cards: round2Ids, catalog: allCardsMap },
      round_3_cards: round3Ids,
    });

    // Distribuer 12 cartes à chaque joueur pour la Manche 1
    const handRows = playerIds.map((pid, idx) => ({
      game_id: gameRow.id,
      player_id: pid,
      is_bot: playersPublic[pid].isBot,
      hand_card_ids: round1Ids.slice(idx * 12, (idx + 1) * 12),
      reserve_card_ids: [],
    }));

    await supabase.from('player_private_hands').insert(handRows);

    return NextResponse.json({
      gameId: gameRow.id,
      playerId: humanPlayerId,
      catalog: allCardsMap,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur création partie';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
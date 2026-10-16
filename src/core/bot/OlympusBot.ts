// src/core/bot/OlympusBot.ts
import {
  CardDefinition,
  GamePublicState,
  TurnActionCommand,
  TurnSubmission,
} from '../types/game.types';

export function computeBotTurnSubmission(
  botId: string,
  handCardIds: string[],
  reserveCardIds: string[],
  game: GamePublicState,
  allCardsMap: Record<string, CardDefinition>
): TurnSubmission {
  const handCards = handCardIds.map((id) => allCardsMap[id]).filter(Boolean);

  // Tri heuristique : 1. Territoires, 2. Bonus, 3. Bâtiments/Dieux, 4. Reste
  const scored = handCards.map((card) => {
    let score = 0;
    if (card.category === 'TERRITORY') score = 100;
    else if (card.category === 'BONUS') score = 80;
    else if (card.category === 'BUILDING' || card.category === 'SECONDARY_GOD') score = 70;
    else if (card.category === 'SPECIAL_RESOURCE') score = 60;
    else if (card.category === 'INHABITANT') score = 50;
    else if (card.category === 'MALUS') score = 40;
    return { card, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const picked = scored.slice(0, 2).map((s) => s.card);
  const commands: TurnActionCommand[] = [];

  const ownedTiles = game.board_tiles.filter((t) => t.ownerId === botId);

  picked.forEach((card, index) => {
    if (card.category === 'TERRITORY' && card.targetCoord) {
      commands.push({
        cardId: card.id,
        source: 'HAND',
        actionType: 'CLAIM_TERRITORY',
        targetCoord: card.targetCoord,
      });
    } else if (card.category === 'BONUS') {
      commands.push({
        cardId: card.id,
        source: 'HAND',
        actionType: 'PLAY_BONUS',
      });
    } else if (
      (card.category === 'BUILDING' || card.category === 'SECONDARY_GOD') &&
      ownedTiles.some(
        (t) =>
          !t.building &&
          (!card.allowedTerrains || card.allowedTerrains.includes(t.terrain))
      )
    ) {
      const validTile = ownedTiles.find(
        (t) =>
          !t.building &&
          (!card.allowedTerrains || card.allowedTerrains.includes(t.terrain))
      )!;
      commands.push({
        cardId: card.id,
        source: 'HAND',
        actionType: 'BUILD_ON_TILE',
        targetCoord: validTile.coord,
      });
    } else if (index === 1) {
      // Défausse la 2e carte contre +3 Drachmes si elle n'est pas immédiatement jouable
      commands.push({
        cardId: card.id,
        source: 'HAND',
        actionType: 'DISCARD_FOR_DRACHMAS',
      });
    } else {
      commands.push({
        cardId: card.id,
        source: 'HAND',
        actionType: 'MOVE_TO_RESERVE',
      });
    }
  });

  return {
    playerId: botId,
    pickedFromHand: [picked[0]?.id || handCardIds[0], picked[1]?.id || handCardIds[1]],
    commands,
    reserveCleanupDecisions: reserveCardIds.map((cid) => ({
      cardId: cid,
      decision: 'BURN',
    })),
  };
}
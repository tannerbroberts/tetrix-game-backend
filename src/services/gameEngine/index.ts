import type { TileData, SerializedQueueItem, Location, ColorName, Shape } from '../../models/types';
import { loadGameState, saveGameState } from '../gameStateService';
import { rotateShape } from './shapeRotation';
import { isValidPlacement, getShapeBlocks } from './shapeValidation';
import { clearFullLines } from './lineClearing';
import { calculateScore } from './scoring';
import { generateRandomShape } from './shapeGeneration';
import { checkGameOver } from './gameOverDetection';
import { isCompactShape, unpackShape } from '../../utils/bytePacking';

/**
 * Request format for placing a shape
 */
export type PlaceShapeRequest = {
  shapeId: number;
  x: number; // Row (0-9)
  y: number; // Column (0-9)
  rotation: number; // 0, 90, 180, or 270
};

/**
 * Result of a successful shape placement
 */
export type PlacementResult = {
  tiles: TileData[]; // Flat array of 100 tiles
  pointsEarned: number;
  totalScore: number;
  linesCleared: {
    rows: number[];
    columns: number[];
  };
  newShape: {
    id: number;
    shape: any;
  };
  queue: SerializedQueueItem[];
  isGameOver: boolean;
};

/**
 * Custom error for placement failures
 */
export class PlacementError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'PlacementError';
  }
}

/**
 * Convert tiles array to 10x10 2D array for response
 */
function tilesToGrid(tiles: TileData[]): TileData[][] {
  const grid: TileData[][] = [];

  for (let row = 1; row <= 10; row++) {
    const rowData: TileData[] = [];
    for (let col = 1; col <= 10; col++) {
      const tile = tiles.find(t => t.position === `R${row}C${col}`);
      if (tile) {
        rowData.push(tile);
      } else {
        // Create empty tile if missing
        rowData.push({
          position: `R${row}C${col}`,
          backgroundColor: 'grey',
          isFilled: false,
          color: 'grey',
        });
      }
    }
    grid.push(rowData);
  }

  return grid;
}

/**
 * Convert tiles Map to array (helper for Map-based operations)
 */
function tilesToMap(tiles: TileData[]): Map<string, TileData> {
  const map = new Map<string, TileData>();
  for (const tile of tiles) {
    map.set(tile.position, tile);
  }
  return map;
}

/**
 * Main orchestrator for processing a shape placement
 */
export async function processShapePlacement(
  userId: string,
  request: PlaceShapeRequest
): Promise<PlacementResult> {
  // 1. Load current game state
  const gameState = await loadGameState(userId);
  if (!gameState) {
    throw new PlacementError('Game state not found', 'GAME_STATE_NOT_FOUND', 404);
  }

  // 2. Validate shapeId exists in queue
  const queueItem = gameState.nextQueue.find(item => {
    if (item.type === 'shape') {
      // The queue items from DB don't have IDs, we need to add them
      // For now, we'll use array index as ID (this needs to be fixed in DB)
      return true; // TODO: Fix this - need to store IDs in queue
    }
    return false;
  });

  const shapeIndex = gameState.nextQueue.findIndex((item, idx) => {
    return item.type === 'shape' && idx === request.shapeId;
  });

  if (shapeIndex === -1 || gameState.nextQueue[shapeIndex].type !== 'shape') {
    throw new PlacementError('Invalid shape ID', 'INVALID_SHAPE_ID', 400);
  }

  const shapeData = gameState.nextQueue[shapeIndex];
  if (shapeData.type !== 'shape') {
    throw new PlacementError('Queue item is not a shape', 'NOT_A_SHAPE', 400);
  }

  // 3. Apply rotation
  const location: Location = { row: request.x, column: request.y };
  // Unpack compact shape if needed
  const shape: Shape = isCompactShape(shapeData.shape) ? unpackShape(shapeData.shape) : shapeData.shape;
  const rotatedShape = rotateShape(shape, request.rotation);

  // 4. Validate placement (bounds + collision)
  const isValid = isValidPlacement(rotatedShape, location, gameState.tiles);
  if (!isValid) {
    throw new PlacementError('Invalid placement - collision or out of bounds', 'INVALID_PLACEMENT', 400);
  }

  // 5. Apply shape to board
  const tilesMap = tilesToMap(gameState.tiles);
  const shapeBlocks = getShapeBlocks(rotatedShape, location);

  for (const { row, col, block } of shapeBlocks) {
    const tileKey = `R${row}C${col}`;
    const existingTile = tilesMap.get(tileKey);
    if (existingTile) {
      tilesMap.set(tileKey, {
        ...existingTile,
        isFilled: block.isFilled,
        color: block.color as ColorName,
      });
    }
  }

  const updatedTiles = Array.from(tilesMap.values());

  // 6. Clear completed lines
  const clearResult = clearFullLines(updatedTiles);

  // 7. Calculate score
  const pointsEarned = calculateScore(
    clearResult.clearedRows.length,
    clearResult.clearedColumns.length
  );
  const newScore = gameState.score + pointsEarned;

  // 8. Remove used shape from queue
  const updatedQueue = gameState.nextQueue.filter((_, idx) => idx !== shapeIndex);

  // 9. Generate new shape
  const newShape = generateRandomShape();
  const newShapeId = (gameState.nextQueue.length > 0 ? shapeIndex : 0) + 1;
  const newQueueItem: SerializedQueueItem = {
    type: 'shape',
    shape: newShape,
  };
  updatedQueue.push(newQueueItem);

  // 10. Check game over
  const isGameOver = checkGameOver(clearResult.tiles, updatedQueue, newScore);

  // 11. Save updated state to database
  await saveGameState(userId, {
    score: newScore,
    tiles: clearResult.tiles,
    nextQueue: updatedQueue,
    shapesUsed: gameState.shapesUsed + 1,
    totalLinesCleared: gameState.totalLinesCleared + clearResult.totalLinesCleared,
    hasPlacedFirstShape: true,
  });

  // 12. Return result
  return {
    tiles: clearResult.tiles, // Already flat TileData[]
    pointsEarned,
    totalScore: newScore,
    linesCleared: {
      rows: clearResult.clearedRows.map(r => r.index),
      columns: clearResult.clearedColumns.map(c => c.index),
    },
    newShape: {
      id: newShapeId,
      shape: newShape,
    },
    queue: updatedQueue,
    isGameOver,
  };
}

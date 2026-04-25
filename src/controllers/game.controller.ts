import { Request, Response } from 'express';
import * as gameStateService from '../services/gameStateService';
import * as placementValidator from '../services/placementValidator';
import { processShapePlacement, PlacementError } from '../services/gameEngine';
import { isCompactShape, unpackShape } from '../utils/bytePacking';
import type { Shape } from '../models/types';

/**
 * Load game state for current user
 */
export async function getGameState(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId!;

    // Use ensureGameState to auto-initialize if needed
    const gameState = await gameStateService.ensureGameState(userId);

    res.status(200).json(gameState);
  } catch (error) {
    console.error('Get game state error:', error);
    res.status(500).json({ error: 'Failed to load game state' });
  }
}

/**
 * Save or update game state
 */
export async function saveGameState(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const gameState = req.body;

    await gameStateService.saveGameState(userId, gameState);

    res.status(200).json({
      message: 'Game state saved successfully',
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error('Save game state error:', error);
    res.status(500).json({ error: 'Failed to save game state' });
  }
}

/**
 * Place shape on board (with validation)
 */
export async function placeShape(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { location, shape, shapeIndex } = req.body;

    // 1. Load current game state
    const gameState = await gameStateService.loadGameState(userId);

    if (!gameState) {
      res.status(404).json({ error: 'No game state found' });
      return;
    }

    // 2. Validate placement
    const isValid = placementValidator.validatePlacement(gameState.tiles, location, shape);

    if (!isValid) {
      res.status(400).json({
        valid: false,
        reason: 'Invalid placement - shape overlaps or out of bounds',
      });
      return;
    }

    // 3. Apply shape to board
    const updatedTiles = placementValidator.applyShapeToBoard(gameState.tiles, location, shape);

    // 4. Clear lines and calculate score
    const { clearedTiles, linesCleared, rowsCleared, columnsCleared } =
      placementValidator.clearLines(updatedTiles);

    const pointsEarned = placementValidator.calculatePoints(
      shape,
      linesCleared,
      rowsCleared,
      columnsCleared
    );

    const newScore = gameState.score + pointsEarned;

    // 5. Remove used shape from queue and generate new one if needed
    const updatedQueue = [...gameState.nextQueue];

    if (shapeIndex >= 0 && shapeIndex < updatedQueue.length) {
      updatedQueue.splice(shapeIndex, 1);
    }

    // Add new shape if queue is getting low
    if (updatedQueue.length < 3) {
      updatedQueue.push({ type: 'shape', shape: placementValidator.generateRandomShape() });
    }

    // 6. Save updated state
    await gameStateService.saveGameState(userId, {
      score: newScore,
      tiles: clearedTiles,
      nextQueue: updatedQueue,
      shapesUsed: (gameState.shapesUsed || 0) + 1,
      totalLinesCleared: (gameState.totalLinesCleared || 0) + linesCleared,
      hasPlacedFirstShape: true,
    });

    // 7. Return success response
    res.status(200).json({
      valid: true,
      newScore,
      linesCleared,
      updatedTiles: clearedTiles,
      nextQueue: updatedQueue,
    });
  } catch (error) {
    console.error('Place shape error:', error);
    res.status(500).json({ error: 'Failed to place shape' });
  }
}

/**
 * Rotate shape in queue
 */
export async function rotateShape(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { shapeIndex, clockwise } = req.body;

    // Load game state
    const gameState = await gameStateService.loadGameState(userId);

    if (!gameState) {
      res.status(404).json({ error: 'No game state found' });
      return;
    }

    // Get the shape from queue
    if (shapeIndex < 0 || shapeIndex >= gameState.nextQueue.length) {
      res.status(400).json({ error: 'Invalid shape index' });
      return;
    }

    const queueItem = gameState.nextQueue[shapeIndex];

    if (queueItem.type !== 'shape') {
      res.status(400).json({ error: 'Cannot rotate purchasable slot' });
      return;
    }

    // Rotate the shape (simplified - full impl would copy frontend logic)
    // Unpack compact shape if needed
    const shape: Shape = isCompactShape(queueItem.shape) ? unpackShape(queueItem.shape) : queueItem.shape;
    const rotatedShape = clockwise ? rotateShapeClockwise(shape) : rotateShapeCounterClockwise(shape);

    // Update queue
    const updatedQueue = [...gameState.nextQueue];
    updatedQueue[shapeIndex] = { type: 'shape', shape: rotatedShape };

    // Save updated queue
    await gameStateService.saveGameState(userId, { nextQueue: updatedQueue });

    res.status(200).json({
      rotatedShape,
      updatedQueue,
    });
  } catch (error) {
    console.error('Rotate shape error:', error);
    res.status(500).json({ error: 'Failed to rotate shape' });
  }
}

/**
 * Unlock shape slot
 */
export async function unlockSlot(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { slotNumber, cost } = req.body;

    // Load game state
    const gameState = await gameStateService.loadGameState(userId);

    if (!gameState) {
      res.status(404).json({ error: 'No game state found' });
      return;
    }

    // Check if user has enough points
    if (gameState.score < cost) {
      res.status(400).json({
        error: 'insufficient_funds',
        required: cost,
        current: gameState.score,
      });
      return;
    }

    // Check if slot already unlocked
    if (gameState.unlockedSlots && gameState.unlockedSlots.includes(slotNumber)) {
      res.status(400).json({ error: 'Slot already unlocked' });
      return;
    }

    // Unlock slot and deduct cost
    const unlockedSlots = [...(gameState.unlockedSlots || [1]), slotNumber];
    const newScore = gameState.score - cost;

    // Remove purchasable slot from queue and add a real shape
    const updatedQueue = gameState.nextQueue.filter(
      (item) => !(item.type === 'purchasable-slot' && item.slotNumber === slotNumber)
    );

    await gameStateService.saveGameState(userId, {
      score: newScore,
      unlockedSlots,
      nextQueue: updatedQueue,
    });

    res.status(200).json({
      newScore,
      unlockedSlots,
      updatedQueue,
    });
  } catch (error) {
    console.error('Unlock slot error:', error);
    res.status(500).json({ error: 'Failed to unlock slot' });
  }
}

/**
 * Reset game state
 */
export async function resetGame(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId!;

    await gameStateService.resetGameState(userId);

    // Load updated stats
    const gameState = await gameStateService.loadGameState(userId);

    res.status(200).json({
      message: 'Game reset successfully',
      stats: gameState?.stats,
    });
  } catch (error) {
    console.error('Reset game error:', error);
    res.status(500).json({ error: 'Failed to reset game' });
  }
}

/**
 * New server-authoritative placement endpoint
 */
export async function placeShapeV2(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { shapeId, x, y, rotation } = req.body;

    const result = await processShapePlacement(userId, { shapeId, x, y, rotation });

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof PlacementError) {
      res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }

    console.error('Place shape v2 error:', error);
    res.status(500).json({ error: 'Failed to place shape' });
  }
}

/**
 * Server-authoritative shape placement (minimal request)
 * POST /api/game/state with {shapeId, x, y, useCompactFormat?}
 */
export async function placeShapeMinimal(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { shapeId, x, y, useCompactFormat } = req.body;

    // Convert 1-indexed to 0-indexed for internal processing
    const result = await processShapePlacement(userId, {
      shapeId,
      x: x - 1,
      y: y - 1,
      rotation: 0 // No rotation - shape is already in correct orientation
    });

    // Calculate total lines cleared
    const totalLinesCleared = result.linesCleared.rows.length + result.linesCleared.columns.length;

    // Return compact format if requested
    if (useCompactFormat) {
      const { packTiles, packShape } = require('../utils/bytePacking');

      // Tiles are already flat, no need to flatten
      const compactTiles = packTiles(result.tiles);

      // Pack shapes in the queue
      const compactQueue = result.queue.map((item: any) => {
        if (item.type === 'shape') {
          return {
            type: 'shape',
            shape: packShape(item.shape)
          };
        }
        return item;
      });

      res.status(200).json({
        success: true,
        tiles: Array.from(compactTiles), // Convert Uint8Array to regular array for JSON
        score: result.totalScore,
        linesCleared: totalLinesCleared,
        updatedQueue: compactQueue,
        gameOver: result.isGameOver || false,
      });
    } else {
      // Legacy format - tiles are already flat
      res.status(200).json({
        success: true,
        tiles: result.tiles,
        score: result.totalScore,
        linesCleared: totalLinesCleared,
        updatedQueue: result.queue,
        gameOver: result.isGameOver || false,
      });
    }
  } catch (error) {
    if (error instanceof PlacementError) {
      res.status(400).json({
        success: false,
        error: error.code,
        message: error.message,
      });
      return;
    }

    console.error('Place shape minimal error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to place shape'
    });
  }
}

/**
 * Server-authoritative shape rotation
 * POST /api/game/rotate with {shapeId, direction}
 */
export async function rotateShapeMinimal(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { shapeId, direction } = req.body;

    // Load game state
    const gameState = await gameStateService.loadGameState(userId);

    if (!gameState) {
      res.status(404).json({
        success: false,
        error: 'NO_GAME_STATE',
        message: 'No game state found'
      });
      return;
    }

    // Validate shapeId
    if (shapeId < 0 || shapeId >= gameState.nextQueue.length) {
      res.status(400).json({
        success: false,
        error: 'INVALID_SHAPE_ID',
        message: 'Invalid shape index'
      });
      return;
    }

    const queueItem = gameState.nextQueue[shapeId];

    if (queueItem.type !== 'shape') {
      res.status(400).json({
        success: false,
        error: 'NOT_A_SHAPE',
        message: 'Cannot rotate purchasable slot'
      });
      return;
    }

    // Rotate the shape
    // Unpack compact shape if needed
    const shape: Shape = isCompactShape(queueItem.shape) ? unpackShape(queueItem.shape) : queueItem.shape;
    const rotatedShape = direction === 'clockwise'
      ? rotateShapeClockwise(shape)
      : rotateShapeCounterClockwise(shape);

    // Update queue
    const updatedQueue = [...gameState.nextQueue];
    updatedQueue[shapeId] = { type: 'shape', shape: rotatedShape };

    // Save updated queue
    await gameStateService.saveGameState(userId, { nextQueue: updatedQueue });

    res.status(200).json({
      success: true,
      newShape: rotatedShape,
      updatedQueue,
    });
  } catch (error) {
    console.error('Rotate shape minimal error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to rotate shape'
    });
  }
}

// Helper functions for shape rotation
function rotateShapeClockwise(shape: any[][]): any[][] {
  const n = shape.length;
  const rotated = Array(n).fill(null).map(() => Array(n).fill(null));

  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      rotated[col][n - 1 - row] = shape[row][col];
    }
  }

  return rotated;
}

function rotateShapeCounterClockwise(shape: any[][]): any[][] {
  // 3 clockwise rotations = 1 counter-clockwise
  return rotateShapeClockwise(rotateShapeClockwise(rotateShapeClockwise(shape)));
}

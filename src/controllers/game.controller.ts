import { Request, Response } from 'express';
import * as gameStateService from '../services/gameStateService';

/**
 * Load game state for current user
 */
export async function getGameState(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId!;

    const gameState = await gameStateService.loadGameState(userId);

    if (!gameState) {
      res.status(404).json({ error: 'No game state found' });
      return;
    }

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
 * TODO: Implement full validation service
 */
export async function placeShape(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { location, shape, shapeIndex } = req.body;

    // For now, just return success
    // Full implementation would:
    // 1. Load current game state
    // 2. Validate placement (isValidPlacement)
    // 3. Apply shape to board
    // 4. Clear lines
    // 5. Update score
    // 6. Save updated state

    res.status(200).json({
      valid: true,
      newScore: 0,
      linesCleared: 0,
      updatedTiles: [],
      nextQueue: [],
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
    const shape = queueItem.shape;
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

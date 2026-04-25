import type { Shape, TileData, SerializedQueueItem } from '../../models/types';
import { isValidPlacement } from './shapeValidation';
import { rotateShape } from './shapeRotation';

/**
 * Check if the game is over (no valid moves left)
 * Ported from frontend/src/gameOverUtils/index.ts
 *
 * @param tiles - The current state of the grid
 * @param queue - The queue of available items (shapes and purchasable slots)
 * @param currentScore - The player's current score (for rotation affordability check)
 * @returns true if no shape can be placed anywhere on the grid
 */
export function checkGameOver(
  tiles: TileData[],
  queue: SerializedQueueItem[],
  currentScore: number = 0,
): boolean {
  // Extract only shapes from the queue (ignore purchasable slots)
  const shapes: Shape[] = queue
    .filter((item): item is { type: 'shape'; shape: Shape } => item.type === 'shape')
    .map(item => item.shape);

  // If no shapes left, it's not game over (new ones will spawn)
  if (shapes.length === 0) {
    return false;
  }

  // For each available shape
  for (const shape of shapes) {
    const canAffordRotation = currentScore >= 1; // Rotation costs 1 point

    // If player can afford rotation, check all 4 rotations. Otherwise, only check current orientation
    const rotationsToCheck = canAffordRotation ? 4 : 1;

    let currentShape = shape;

    for (let rotation = 0; rotation < rotationsToCheck; rotation++) {
      // Check all possible grid positions
      // The grid is 10x10 (0-indexed: 0-9). The shape is typically 4x4 (but can be larger).
      // We need to check placement where the top-left of the shape grid
      // could be such that the shape fits.
      // Range: -3 to 9 covers all possibilities where at least one block might be in bounds
      for (let row = -3; row <= 9; row++) {
        for (let col = -3; col <= 9; col++) {
          if (isValidPlacement(currentShape, { row, column: col }, tiles)) {
            return false; // Found a valid move!
          }
        }
      }

      // Rotate for next iteration (only if we're going to check it)
      if (rotation < rotationsToCheck - 1) {
        currentShape = rotateShape(currentShape, 90);
      }
    }
  }

  return true; // No valid moves found for any shape in any rotation
}

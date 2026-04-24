/**
 * Calculates score using exponential formula with 5x multiplier:
 * ((rows_cleared)² + (columns_cleared)² + (rows × columns × 2)) × 5
 *
 * Ported from frontend/src/scoringUtils/index.ts
 *
 * Examples:
 * - 1 row: 1² × 5 = 5 points
 * - 2 rows: 2² × 5 = 20 points
 * - 1 row + 1 column: (1² + 1² + (1×1×2)) × 5 = 4 × 5 = 20 points
 * - 3 rows + 2 columns: (3² + 2² + (3×2×2)) × 5 = 25 × 5 = 125 points
 */
export function calculateScore(rowsCleared: number, columnsCleared: number): number {
  const rowScore = Math.pow(rowsCleared, 2);
  const columnScore = Math.pow(columnsCleared, 2);
  const mixedBonus = rowsCleared > 0 && columnsCleared > 0 ? rowsCleared * columnsCleared * 2 : 0;

  const basePoints = rowScore + columnScore + mixedBonus;
  const pointsEarned = basePoints * 5; // Apply 5x multiplier

  return pointsEarned;
}

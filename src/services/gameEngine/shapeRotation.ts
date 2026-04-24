import type { Shape } from '../../models/types';

/**
 * Rotate a shape 90 degrees clockwise
 * Ported from frontend/src/shapeTransforms/index.ts
 */
export function rotateShape90(shape: Shape): Shape {
  const n = shape.length;
  const rotated: Shape = new Array(n).fill(null).map(() =>
    new Array(n).fill(null).map(() => ({ ...shape[0][0], isFilled: false })));

  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      rotated[col][n - 1 - row] = shape[row][col];
    }
  }

  return rotated;
}

/**
 * Rotate a shape by specified degrees (0, 90, 180, 270)
 * @param shape - The shape to rotate
 * @param degrees - Rotation in degrees (must be 0, 90, 180, or 270)
 * @returns Rotated shape
 */
export function rotateShape(shape: Shape, degrees: number): Shape {
  if (degrees === 0) return shape;

  const rotationCount = degrees / 90;
  let rotated = shape;

  for (let i = 0; i < rotationCount; i++) {
    rotated = rotateShape90(rotated);
  }

  return rotated;
}

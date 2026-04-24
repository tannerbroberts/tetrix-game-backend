import type { Shape, Block, ColorName } from '../../models/types';

/**
 * Shape generation - Ported from frontend/src/shapeGeneration/index.ts
 */

/**
 * Shape type definitions
 */
export type ShapeType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

/**
 * Shape-to-color mapping (Tetris conventions)
 */
export const SHAPE_COLORS: Record<ShapeType, ColorName> = {
  'I': 'white',
  'O': 'yellow',
  'T': 'purple',
  'S': 'green',
  'Z': 'red',
  'J': 'blue',
  'L': 'orange',
};

/**
 * Helper function to create an empty block
 */
function createEmptyBlock(): Block {
  return { color: 'grey', isFilled: false };
}

/**
 * Helper function to create a filled block with a specific color
 */
function createFilledBlock(color: ColorName): Block {
  return { color, isFilled: true };
}

/**
 * Clone a shape
 */
function cloneShape(shape: Shape): Shape {
  return shape.map((row) => row.map((block) => ({ ...block })));
}

/**
 * Rotate a shape 90 degrees clockwise
 */
function rotateShape(shape: Shape): Shape {
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
 * Generate a random shape with balanced probability distribution
 * Each base shape type has equal likelihood of being selected, then orientation is randomly chosen
 *
 * Shape types and their rotation counts:
 * - I-piece (4-block line): 2 unique rotations → white
 * - O-piece (square): 1 rotation (no change) → yellow
 * - T-piece: 4 rotations → purple
 * - S-piece: 2 unique rotations → green
 * - Z-piece: 2 unique rotations → red
 * - L-piece: 4 rotations → orange
 * - J-piece: 4 rotations → blue
 */
export function generateRandomShape(): Shape {
  // Define base shape templates with their type metadata and unique rotation counts
  const shapeTemplates: Array<{ type: ShapeType; rotations: number }> = [
    { type: 'I', rotations: 2 },
    { type: 'O', rotations: 1 },
    { type: 'T', rotations: 4 },
    { type: 'S', rotations: 2 },
    { type: 'Z', rotations: 2 },
    { type: 'J', rotations: 4 },
    { type: 'L', rotations: 4 },
  ];

  // Select a random shape template
  const { type, rotations } = shapeTemplates[Math.floor(Math.random() * shapeTemplates.length)];

  // Get the designated color for this shape type
  const color = SHAPE_COLORS[type];
  const _ = createEmptyBlock;
  const X = (): Block => ({ color, isFilled: true });

  // Map shape type to template
  const shapeTypeTemplates: Record<ShapeType, Shape> = {
    'I': [
      [_(), _(), _(), _()],
      [_(), _(), _(), _()],
      [X(), X(), X(), X()],
      [_(), _(), _(), _()],
    ],
    'O': [
      [_(), _(), _(), _()],
      [_(), X(), X(), _()],
      [_(), X(), X(), _()],
      [_(), _(), _(), _()],
    ],
    'T': [
      [_(), _(), _(), _()],
      [_(), X(), _(), _()],
      [X(), X(), X(), _()],
      [_(), _(), _(), _()],
    ],
    'S': [
      [_(), _(), _(), _()],
      [_(), X(), X(), _()],
      [X(), X(), _(), _()],
      [_(), _(), _(), _()],
    ],
    'Z': [
      [_(), _(), _(), _()],
      [X(), X(), _(), _()],
      [_(), X(), X(), _()],
      [_(), _(), _(), _()],
    ],
    'J': [
      [_(), _(), _(), _()],
      [X(), _(), _(), _()],
      [X(), X(), X(), _()],
      [_(), _(), _(), _()],
    ],
    'L': [
      [_(), _(), _(), _()],
      [X(), X(), X(), _()],
      [X(), _(), _(), _()],
      [_(), _(), _(), _()],
    ],
  };

  const template = shapeTypeTemplates[type];

  // Apply a random number of rotations (0 to rotations-1)
  const numRotations = Math.floor(Math.random() * rotations);
  let shape = cloneShape(template);

  for (let i = 0; i < numRotations; i++) {
    shape = rotateShape(shape);
  }

  return shape;
}

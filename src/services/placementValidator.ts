import { Shape, TileData, Location, ColorName, Block } from '../models/types';

const GRID_SIZE = 10;
const SHAPE_SIZE = 4;

/**
 * Create an empty Block (unfilled)
 */
function createEmptyBlock(): Block {
  return { color: 'grey', isFilled: false };
}

/**
 * Create a filled Block with the specified color
 */
function createFilledBlock(color: ColorName): Block {
  return { color, isFilled: true };
}

/**
 * Validate that a shape can be placed at the specified location
 */
export function validatePlacement(
  tiles: TileData[],
  location: Location,
  shape: Shape
): boolean {
  // Build a lookup map of filled positions
  const filledPositions = new Set<string>();
  tiles.forEach(tile => {
    if (tile.isFilled) {
      filledPositions.add(tile.position);
    }
  });

  // Check each block in the shape
  for (let shapeRow = 0; shapeRow < SHAPE_SIZE; shapeRow++) {
    for (let shapeCol = 0; shapeCol < SHAPE_SIZE; shapeCol++) {
      const block = shape[shapeRow][shapeCol];

      // Skip empty blocks
      if (!block || !block.isFilled) {
        continue;
      }

      // Calculate grid position
      const gridRow = location.row + shapeRow;
      const gridCol = location.column + shapeCol;

      // Check bounds (1-indexed, 1 to GRID_SIZE)
      if (gridRow < 1 || gridRow > GRID_SIZE || gridCol < 1 || gridCol > GRID_SIZE) {
        return false;
      }

      // Check for overlap
      const position = `R${gridRow}C${gridCol}`;
      if (filledPositions.has(position)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Apply a shape to the board, returning updated tiles
 */
export function applyShapeToBoard(
  tiles: TileData[],
  location: Location,
  shape: Shape
): TileData[] {
  // Create a copy of tiles
  const updatedTiles = [...tiles];
  const tileMap = new Map<string, TileData>();

  updatedTiles.forEach(tile => {
    tileMap.set(tile.position, tile);
  });

  // Add each block from the shape
  for (let shapeRow = 0; shapeRow < SHAPE_SIZE; shapeRow++) {
    for (let shapeCol = 0; shapeCol < SHAPE_SIZE; shapeCol++) {
      const block = shape[shapeRow][shapeCol];

      // Skip empty blocks
      if (!block || !block.isFilled) {
        continue;
      }

      const gridRow = location.row + shapeRow;
      const gridCol = location.column + shapeCol;
      const position = `R${gridRow}C${gridCol}`;

      // Get color from block
      const color: ColorName = block.color || 'red';

      if (tileMap.has(position)) {
        // Update existing tile
        const tile = tileMap.get(position)!;
        tile.isFilled = true;
        tile.color = color;
      } else {
        // Create new tile
        const newTile: TileData = {
          position,
          isFilled: true,
          color,
        };
        tileMap.set(position, newTile);
      }
    }
  }

  return Array.from(tileMap.values());
}

/**
 * Check for complete lines and clear them
 */
export function clearLines(tiles: TileData[]): {
  clearedTiles: TileData[];
  linesCleared: number;
  rowsCleared: number[];
  columnsCleared: number[];
} {
  const tileMap = new Map<string, TileData>();
  tiles.forEach(tile => {
    tileMap.set(tile.position, tile);
  });

  const rowsCleared: number[] = [];
  const columnsCleared: number[] = [];

  // Check rows
  for (let row = 1; row <= GRID_SIZE; row++) {
    let allFilled = true;
    for (let col = 1; col <= GRID_SIZE; col++) {
      const position = `R${row}C${col}`;
      const tile = tileMap.get(position);
      if (!tile || !tile.isFilled) {
        allFilled = false;
        break;
      }
    }
    if (allFilled) {
      rowsCleared.push(row);
    }
  }

  // Check columns
  for (let col = 1; col <= GRID_SIZE; col++) {
    let allFilled = true;
    for (let row = 1; row <= GRID_SIZE; row++) {
      const position = `R${row}C${col}`;
      const tile = tileMap.get(position);
      if (!tile || !tile.isFilled) {
        allFilled = false;
        break;
      }
    }
    if (allFilled) {
      columnsCleared.push(col);
    }
  }

  // Clear the tiles
  for (const row of rowsCleared) {
    for (let col = 1; col <= GRID_SIZE; col++) {
      const position = `R${row}C${col}`;
      const tile = tileMap.get(position);
      if (tile) {
        tile.isFilled = false;
      }
    }
  }

  for (const col of columnsCleared) {
    for (let row = 1; row <= GRID_SIZE; row++) {
      const position = `R${row}C${col}`;
      const tile = tileMap.get(position);
      if (tile) {
        tile.isFilled = false;
      }
    }
  }

  const linesCleared = rowsCleared.length + columnsCleared.length;

  return {
    clearedTiles: Array.from(tileMap.values()),
    linesCleared,
    rowsCleared,
    columnsCleared,
  };
}

/**
 * Calculate points earned from a placement
 */
export function calculatePoints(
  shape: Shape,
  linesCleared: number,
  rowsCleared: number[],
  columnsCleared: number[]
): number {
  // Count filled blocks in shape
  let blockCount = 0;
  for (let row = 0; row < SHAPE_SIZE; row++) {
    for (let col = 0; col < SHAPE_SIZE; col++) {
      const block = shape[row][col];
      if (block && block.isFilled) {
        blockCount++;
      }
    }
  }

  // Base points for placing shape
  let points = blockCount;

  // Bonus for clearing lines
  if (linesCleared > 0) {
    // Each line cleared is worth 10 points
    points += linesCleared * GRID_SIZE;

    // Bonus for clearing multiple lines at once
    if (linesCleared === 2) {
      points += 10; // Double bonus
    } else if (linesCleared === 3) {
      points += 30; // Triple bonus
    } else if (linesCleared >= 4) {
      points += 100; // Quad bonus
    }
  }

  return points;
}

/**
 * Generate a random shape for the queue
 */
export function generateRandomShape(): Shape {
  const e = createEmptyBlock();
  // Simple shapes for testing
  const shapes: Shape[] = [
    // I-piece (vertical)
    [
      [e, e, e, e],
      [createFilledBlock('blue'), e, e, e],
      [createFilledBlock('blue'), e, e, e],
      [createFilledBlock('blue'), e, e, e],
    ],
    // O-piece (2x2)
    [
      [e, e, e, e],
      [e, createFilledBlock('yellow'), createFilledBlock('yellow'), e],
      [e, createFilledBlock('yellow'), createFilledBlock('yellow'), e],
      [e, e, e, e],
    ],
    // T-piece
    [
      [e, e, e, e],
      [e, createFilledBlock('purple'), e, e],
      [createFilledBlock('purple'), createFilledBlock('purple'), createFilledBlock('purple'), e],
      [e, e, e, e],
    ],
    // L-piece
    [
      [e, e, e, e],
      [createFilledBlock('orange'), e, e, e],
      [createFilledBlock('orange'), e, e, e],
      [createFilledBlock('orange'), createFilledBlock('orange'), e, e],
    ],
    // Single block
    [
      [e, e, e, e],
      [e, createFilledBlock('red'), e, e],
      [e, e, e, e],
      [e, e, e, e],
    ],
  ];

  return shapes[Math.floor(Math.random() * shapes.length)];
}

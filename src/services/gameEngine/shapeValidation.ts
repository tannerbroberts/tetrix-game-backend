import type { Shape, Location, TileData } from '../../models/types';

const GRID_SIZE = 10;

/**
 * Helper function to create a tile key from location
 */
function makeTileKey(row: number, column: number): string {
  return `R${row}C${column}`;
}

/**
 * Convert tiles array to Map for O(1) lookups
 */
function tilesToMap(tiles: TileData[]): Map<string, TileData> {
  const map = new Map<string, TileData>();
  for (const tile of tiles) {
    map.set(tile.position, tile);
  }
  return map;
}

/**
 * Check if a shape can be placed at a given location
 * Ported from frontend/src/shapeValidation/index.ts
 *
 * @param shape - The shape grid to check
 * @param gridTopLeftLocation - Location where the shape's top-left corner (0,0) would be placed
 * @param tiles - Array of tile data
 * @returns true if the shape can be placed without overlapping or going out of bounds
 */
export function isValidPlacement(
  shape: Shape,
  gridTopLeftLocation: Location,
  tiles: TileData[],
): boolean {
  const tilesMap = tilesToMap(tiles);

  // Iterate through all tiles of the shape grid
  for (let shapeRow = 0; shapeRow < shape.length; shapeRow++) {
    for (let shapeCol = 0; shapeCol < shape[shapeRow].length; shapeCol++) {
      const block = shape[shapeRow][shapeCol];

      // Only check filled blocks
      if (block.isFilled) {
        // Calculate the grid position for this block
        // gridTopLeftLocation is 0-indexed (0-9), convert to 1-indexed for tile keys
        const gridRow = gridTopLeftLocation.row + 1 + shapeRow;
        const gridCol = gridTopLeftLocation.column + 1 + shapeCol;

        // Check bounds (1-indexed, 1-10)
        if (gridRow < 1 || gridRow > GRID_SIZE || gridCol < 1 || gridCol > GRID_SIZE) {
          return false; // Block doesn't fit
        }

        // Check if position exists and is not occupied
        const tileKey = makeTileKey(gridRow, gridCol);
        const tileData = tilesMap.get(tileKey);

        // Tile must exist and must not be filled
        if (!tileData) {
          return false; // Tile doesn't exist at this position
        }

        if (tileData.isFilled) {
          return false; // Block overlaps
        }
      }
    }
  }

  return true;
}

/**
 * Get the grid positions where the shape's filled blocks would be placed
 * Used for placing the shape on the board
 *
 * @param shape - The shape to place
 * @param gridTopLeftLocation - Location where the shape's top-left corner would be placed (0-indexed)
 * @returns Array of { row, col, block } for each filled block
 */
export function getShapeBlocks(
  shape: Shape,
  gridTopLeftLocation: Location,
): Array<{ row: number; col: number; block: { color: string; isFilled: boolean } }> {
  const blocks: Array<{ row: number; col: number; block: { color: string; isFilled: boolean } }> = [];

  for (let shapeRow = 0; shapeRow < shape.length; shapeRow++) {
    for (let shapeCol = 0; shapeCol < shape[shapeRow].length; shapeCol++) {
      const block = shape[shapeRow][shapeCol];

      if (block.isFilled) {
        // Convert 0-indexed location to 1-indexed grid position
        const gridRow = gridTopLeftLocation.row + 1 + shapeRow;
        const gridCol = gridTopLeftLocation.column + 1 + shapeCol;

        blocks.push({
          row: gridRow,
          col: gridCol,
          block: { color: block.color, isFilled: true },
        });
      }
    }
  }

  return blocks;
}

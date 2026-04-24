import type { TileData, ColorName } from '../../models/types';

const GRID_SIZE = 10;

/**
 * Helper to create tile key
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
 * Convert Map back to array
 */
function mapToTiles(tilesMap: Map<string, TileData>): TileData[] {
  return Array.from(tilesMap.values());
}

/**
 * Checks if a specific row is completely filled with blocks
 * Ported from frontend/src/lineUtils/index.ts
 */
export function isRowFull(tiles: TileData[], row: number): boolean {
  const tilesMap = tilesToMap(tiles);

  for (let column = 1; column <= GRID_SIZE; column++) {
    const tile = tilesMap.get(makeTileKey(row, column));
    if (!tile || !tile.isFilled) {
      return false;
    }
  }
  return true;
}

/**
 * Checks if a specific column is completely filled with blocks
 * Ported from frontend/src/lineUtils/index.ts
 */
export function isColumnFull(tiles: TileData[], column: number): boolean {
  const tilesMap = tilesToMap(tiles);

  for (let row = 1; row <= GRID_SIZE; row++) {
    const tile = tilesMap.get(makeTileKey(row, column));
    if (!tile || !tile.isFilled) {
      return false;
    }
  }
  return true;
}

/**
 * Finds all full rows in the grid
 */
export function findFullRows(tiles: TileData[]): number[] {
  const fullRows: number[] = [];
  for (let row = 1; row <= GRID_SIZE; row++) {
    if (isRowFull(tiles, row)) {
      fullRows.push(row);
    }
  }
  return fullRows;
}

/**
 * Finds all full columns in the grid
 */
export function findFullColumns(tiles: TileData[]): number[] {
  const fullColumns: number[] = [];
  for (let column = 1; column <= GRID_SIZE; column++) {
    if (isColumnFull(tiles, column)) {
      fullColumns.push(column);
    }
  }
  return fullColumns;
}

/**
 * Clears (empties) all tiles in the specified rows
 */
export function clearRows(tiles: TileData[], rows: number[]): TileData[] {
  if (rows.length === 0) return tiles;

  const tilesMap = tilesToMap(tiles);
  const rowSet = new Set(rows);

  for (let row = 1; row <= GRID_SIZE; row++) {
    if (rowSet.has(row)) {
      for (let column = 1; column <= GRID_SIZE; column++) {
        const position = makeTileKey(row, column);
        const tile = tilesMap.get(position);
        if (tile) {
          tilesMap.set(position, {
            ...tile,
            isFilled: false,
            color: 'grey' as ColorName,
          });
        }
      }
    }
  }

  return mapToTiles(tilesMap);
}

/**
 * Clears (empties) all tiles in the specified columns
 */
export function clearColumns(tiles: TileData[], columns: number[]): TileData[] {
  if (columns.length === 0) return tiles;

  const tilesMap = tilesToMap(tiles);
  const columnSet = new Set(columns);

  for (let column = 1; column <= GRID_SIZE; column++) {
    if (columnSet.has(column)) {
      for (let row = 1; row <= GRID_SIZE; row++) {
        const position = makeTileKey(row, column);
        const tile = tilesMap.get(position);
        if (tile) {
          tilesMap.set(position, {
            ...tile,
            isFilled: false,
            color: 'grey' as ColorName,
          });
        }
      }
    }
  }

  return mapToTiles(tilesMap);
}

export type ClearedLine = {
  index: number;
  color?: string;
};

/**
 * Finds and clears all full lines (both rows and columns) in the grid
 * This is the main function to call after placing a shape
 */
export function clearFullLines(tiles: TileData[]): {
  tiles: TileData[];
  clearedRows: ClearedLine[];
  clearedColumns: ClearedLine[];
  totalLinesCleared: number;
} {
  const fullRows = findFullRows(tiles);
  const fullColumns = findFullColumns(tiles);

  const clearedRowsWithColor = fullRows.map((row): ClearedLine => ({
    index: row,
  }));

  const clearedColumnsWithColor = fullColumns.map((col): ClearedLine => ({
    index: col,
  }));

  // Clear rows first, then columns
  let newTiles = clearRows(tiles, fullRows);
  newTiles = clearColumns(newTiles, fullColumns);

  return {
    tiles: newTiles,
    clearedRows: clearedRowsWithColor,
    clearedColumns: clearedColumnsWithColor,
    totalLinesCleared: fullRows.length + fullColumns.length,
  };
}

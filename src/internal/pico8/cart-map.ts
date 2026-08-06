import assert from "node:assert/strict";
import type { CartBytes } from "./cart-bytes.ts";
import type { MapGrid } from "./cart-data.ts";

export const MAP_OFFSET = 0x1000;
export const MAP_LENGTH = 0x2000;

const MAP_WIDTH = 128;
const MAP_HEIGHT = 64;
const MAP_CELL_COUNT = MAP_WIDTH * MAP_HEIGHT;

export function decodeMap(bytes: CartBytes): MapGrid {
  const cells = new Array<number>(MAP_CELL_COUNT);
  for (let i = 0; i < MAP_CELL_COUNT; i++) {
    cells[i] = bytes[MAP_OFFSET + i]!;
  }
  const grid: MapGrid = { width: MAP_WIDTH, height: MAP_HEIGHT, cells };
  assert.equal(
    grid.cells.length,
    MAP_CELL_COUNT,
    `decoded map has unexpected length ${grid.cells.length}`,
  );
  return grid;
}

export function encodeMap(grid: MapGrid): Uint8Array {
  assert.equal(
    grid.cells.length,
    MAP_CELL_COUNT,
    `MapGrid.cells must be ${MAP_CELL_COUNT} entries, got ${grid.cells.length}`,
  );
  const bytes = new Uint8Array(MAP_LENGTH);
  for (let i = 0; i < MAP_CELL_COUNT; i++) {
    bytes[i] = grid.cells[i]! & 0xff;
  }
  return bytes;
}

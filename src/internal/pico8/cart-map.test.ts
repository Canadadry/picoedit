import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CartBytes } from "./cart-bytes.ts";
import { decode as decodeCartBytes } from "./cart-bytes.ts";
import type { MapGrid } from "./cart-data.ts";
import { decodeMap, encodeMap, MAP_LENGTH, MAP_OFFSET } from "./cart-map.ts";

const CART_BYTES_LENGTH = 160 * 205;
const MAP_WIDTH = 128;

const cartDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "cart",
);
const fixtures = readdirSync(cartDir).filter((name) => name.endsWith(".p8.png"));

function makeCartBytesWithMapCell(x: number, y: number, value: number): CartBytes {
  const bytes = new Uint8Array(CART_BYTES_LENGTH);
  bytes[MAP_OFFSET + y * MAP_WIDTH + x] = value;
  return bytes as CartBytes;
}

function makeMapGridWithCell(x: number, y: number, value: number): MapGrid {
  const cells = new Array(128 * 64).fill(0);
  cells[y * MAP_WIDTH + x] = value;
  return { width: 128, height: 64, cells };
}

test("decodeMap places a byte at its row-major (x, y) cell", () => {
  const bytes = makeCartBytesWithMapCell(3, 5, 200);
  const grid = decodeMap(bytes);
  assert.equal(grid.width, 128);
  assert.equal(grid.height, 64);
  assert.equal(grid.cells.length, 128 * 64);
  assert.equal(grid.cells[5 * MAP_WIDTH + 3], 200);
  assert.equal(grid.cells[0], 0);
});

test("encodeMap packs a cell back into the byte at its row-major offset", () => {
  const grid = makeMapGridWithCell(3, 5, 200);
  const encoded = encodeMap(grid);
  assert.equal(encoded.length, MAP_LENGTH);
  assert.equal(encoded[5 * MAP_WIDTH + 3], 200);
  assert.equal(encoded[0], 0);
});

test("encodeMap(decodeMap(bytes)) is bit-exact against the original map bytes for every real fixture", async (t) => {
  assert.ok(fixtures.length > 0, "expected at least one .p8.png fixture in cart/");
  for (const fixture of fixtures) {
    await t.test(fixture, () => {
      const originalPngBytes = readFileSync(path.join(cartDir, fixture));
      const cartBytes = decodeCartBytes(originalPngBytes);
      const originalMapBytes = cartBytes.subarray(MAP_OFFSET, MAP_OFFSET + MAP_LENGTH);
      const roundTripped = encodeMap(decodeMap(cartBytes));
      assert.deepStrictEqual(roundTripped, originalMapBytes);
    });
  }
});

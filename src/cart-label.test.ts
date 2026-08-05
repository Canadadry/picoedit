import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PixelGrid } from "./cart-bytes.ts";
import { decodePixelGrid, extractCartBytes, injectCartBytes } from "./cart-bytes.ts";
import { decodeLabel, encodeLabel } from "./cart-label.ts";

const LABEL_WIDTH = 160;
const LABEL_HEIGHT = 205;

function makeBlankGrid(): PixelGrid {
  return {
    width: LABEL_WIDTH,
    height: LABEL_HEIGHT,
    channels: 4,
    depth: 8,
    data: new Uint8Array(LABEL_WIDTH * LABEL_HEIGHT * 4),
  };
}

test("decodeLabel reads a hand-crafted pixel's upper 6 bits per channel", () => {
  const grid = makeBlankGrid();
  grid.data[0] = 0xff;
  grid.data[1] = 0x00;
  grid.data[2] = 0xaa;
  grid.data[3] = 0x55;

  const label = decodeLabel(grid);

  assert.deepStrictEqual(label.pixels[0], { r: 63, g: 0, b: 42, a: 21 });
});

test("encodeLabel writes the decoded upper 6 bits back, leaving baseGrid's own lower 2 bits untouched", () => {
  const sourceGrid = makeBlankGrid();
  sourceGrid.data[0] = 0xff;
  sourceGrid.data[1] = 0x00;
  sourceGrid.data[2] = 0xaa;
  sourceGrid.data[3] = 0x55;
  const label = decodeLabel(sourceGrid);

  const baseGrid = makeBlankGrid();
  baseGrid.data[0] = 0b00000010;
  baseGrid.data[1] = 0b00000001;
  baseGrid.data[2] = 0b00000011;
  baseGrid.data[3] = 0b00000000;

  const result = encodeLabel(label, baseGrid);

  assert.equal(result.data[0], (63 << 2) | 2);
  assert.equal(result.data[1], (0 << 2) | 1);
  assert.equal(result.data[2], (42 << 2) | 3);
  assert.equal(result.data[3], (21 << 2) | 0);
});

const cartDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "cart");
const fixtures = readdirSync(cartDir).filter((name) => name.endsWith(".p8.png"));

test("decodeLabel/encodeLabel round-trip preserves the full pixel grid, combined with cart-data injection, for every real fixture", async (t) => {
  assert.ok(fixtures.length > 0, "expected at least one .p8.png fixture in cart/");
  for (const fixture of fixtures) {
    await t.test(fixture, () => {
      const originalPngBytes = readFileSync(path.join(cartDir, fixture));
      const originalGrid = decodePixelGrid(originalPngBytes);
      const label = decodeLabel(originalGrid);

      const labelOnlyGrid = encodeLabel(label, originalGrid);
      assert.deepStrictEqual(labelOnlyGrid.data, originalGrid.data);

      const cartBytes = extractCartBytes(originalGrid);
      const injectedGrid = injectCartBytes(cartBytes, originalGrid);
      const finalGrid = encodeLabel(label, injectedGrid);
      assert.deepStrictEqual(finalGrid.data, originalGrid.data);
    });
  }
});

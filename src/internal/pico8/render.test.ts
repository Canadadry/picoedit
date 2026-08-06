import { test } from "node:test";
import assert from "node:assert/strict";
import type { IntegerRange_0_16, MapGrid, SpriteSheet } from "./cart-data.ts";
import { PICO8_PALETTE } from "./palette.ts";
import { renderMap, renderSpriteSheet } from "./render.ts";

const SHEET_WIDTH = 128;
const SHEET_HEIGHT = 128;

function makeBlankSheet(): SpriteSheet {
  const pixels = new Array<IntegerRange_0_16>(SHEET_WIDTH * SHEET_HEIGHT).fill(0);
  return { width: SHEET_WIDTH, height: SHEET_HEIGHT, pixels };
}

function pixelAt(grid: { width: number; data: Uint8Array }, x: number, y: number): number[] {
  const base = (y * grid.width + x) * 4;
  return [grid.data[base]!, grid.data[base + 1]!, grid.data[base + 2]!, grid.data[base + 3]!];
}

test("renderSpriteSheet at scale 1 maps a known non-zero pixel to its palette color, and index-0 pixels are opaque black", () => {
  const sheet = makeBlankSheet();
  const x = 5;
  const y = 3;
  sheet.pixels[y * SHEET_WIDTH + x] = 8 as IntegerRange_0_16;

  const result = renderSpriteSheet(sheet, 1);

  assert.equal(result.width, SHEET_WIDTH);
  assert.equal(result.height, SHEET_HEIGHT);
  assert.equal(result.channels, 4);
  assert.equal(result.depth, 8);
  assert.deepStrictEqual(pixelAt(result, x, y), [...PICO8_PALETTE[8]!, 255]);
  assert.deepStrictEqual(pixelAt(result, 0, 0), [0, 0, 0, 255]);
});

test("renderSpriteSheet at scale 2 upscales a single pixel into a 2x2 identical block", () => {
  const sheet = makeBlankSheet();
  sheet.pixels[0] = 8 as IntegerRange_0_16;

  const result = renderSpriteSheet(sheet, 2);

  assert.equal(result.width, SHEET_WIDTH * 2);
  assert.equal(result.height, SHEET_HEIGHT * 2);
  const expected = [...PICO8_PALETTE[8]!, 255];
  assert.deepStrictEqual(pixelAt(result, 0, 0), expected);
  assert.deepStrictEqual(pixelAt(result, 1, 0), expected);
  assert.deepStrictEqual(pixelAt(result, 0, 1), expected);
  assert.deepStrictEqual(pixelAt(result, 1, 1), expected);
  assert.deepStrictEqual(pixelAt(result, 2, 0), [0, 0, 0, 255]);
});

function makeSheetWithSpriteBlock(spriteIndex: number, pixels8x8: number[]): SpriteSheet {
  const sheet = makeBlankSheet();
  const originX = (spriteIndex % 16) * 8;
  const originY = Math.floor(spriteIndex / 16) * 8;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      sheet.pixels[(originY + row) * SHEET_WIDTH + (originX + col)] = pixels8x8[
        row * 8 + col
      ]! as IntegerRange_0_16;
    }
  }
  return sheet;
}

test("renderMap at scale 1 composites the referenced sprite's actual pixels into the cell block", () => {
  const spriteIndex = 3;
  const spritePixels = new Array(64).fill(0);
  spritePixels[0] = 8;
  spritePixels[9] = 11;
  const sheet = makeSheetWithSpriteBlock(spriteIndex, spritePixels);

  const map: MapGrid = { width: 2, height: 1, cells: [spriteIndex, 0] };

  const result = renderMap(map, sheet, 1);

  assert.equal(result.width, 2 * 8);
  assert.equal(result.height, 1 * 8);
  assert.deepStrictEqual(pixelAt(result, 0, 0), [...PICO8_PALETTE[8]!, 255]);
  assert.deepStrictEqual(pixelAt(result, 1, 1), [...PICO8_PALETTE[11]!, 255]);
  assert.deepStrictEqual(pixelAt(result, 8, 0), [0, 0, 0, 255]);
});

test("renderMap at scale 2 upscales the composited image as a whole", () => {
  const spriteIndex = 0;
  const spritePixels = new Array(64).fill(0);
  spritePixels[0] = 8;
  const sheet = makeSheetWithSpriteBlock(spriteIndex, spritePixels);

  const map: MapGrid = { width: 1, height: 1, cells: [spriteIndex] };

  const result = renderMap(map, sheet, 2);

  assert.equal(result.width, 1 * 8 * 2);
  assert.equal(result.height, 1 * 8 * 2);
  const expected = [...PICO8_PALETTE[8]!, 255];
  assert.deepStrictEqual(pixelAt(result, 0, 0), expected);
  assert.deepStrictEqual(pixelAt(result, 1, 0), expected);
  assert.deepStrictEqual(pixelAt(result, 0, 1), expected);
  assert.deepStrictEqual(pixelAt(result, 1, 1), expected);
});

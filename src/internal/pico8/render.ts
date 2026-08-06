import assert from "node:assert/strict";
import type { PixelGrid } from "./cart-bytes.ts";
import type { MapGrid, SpriteSheet } from "./cart-data.ts";
import { PICO8_PALETTE } from "./palette.ts";

const SPRITE_SIZE = 8;
const SPRITE_SHEET_COLUMNS = 16;

function makeBlankPixelGrid(width: number, height: number): PixelGrid {
  return {
    width,
    height,
    channels: 4,
    depth: 8,
    data: new Uint8Array(width * height * 4),
  };
}

function setPixel(grid: PixelGrid, x: number, y: number, index: number): void {
  const color = PICO8_PALETTE[index];
  assert.ok(color, `palette index out of range: ${index}`);
  const base = (y * grid.width + x) * 4;
  grid.data[base] = color[0];
  grid.data[base + 1] = color[1];
  grid.data[base + 2] = color[2];
  grid.data[base + 3] = 255;
}

function nearestNeighborUpscale(source: PixelGrid, scale: number): PixelGrid {
  assert.ok(
    Number.isInteger(scale) && scale > 0,
    `scale must be a positive integer, got ${scale}`,
  );
  if (scale === 1) return source;
  const output = makeBlankPixelGrid(source.width * scale, source.height * scale);
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      const srcBase = (y * source.width + x) * 4;
      const r = source.data[srcBase]!;
      const g = source.data[srcBase + 1]!;
      const b = source.data[srcBase + 2]!;
      const a = source.data[srcBase + 3]!;
      for (let dy = 0; dy < scale; dy++) {
        const outY = y * scale + dy;
        for (let dx = 0; dx < scale; dx++) {
          const outX = x * scale + dx;
          const outBase = (outY * output.width + outX) * 4;
          output.data[outBase] = r;
          output.data[outBase + 1] = g;
          output.data[outBase + 2] = b;
          output.data[outBase + 3] = a;
        }
      }
    }
  }
  return output;
}

/**
 * Renders a SpriteSheet's raw 128x128 palette-index pixels to RGBA, using
 * PICO8_PALETTE (index 0 renders as opaque black, not transparent), then
 * nearest-neighbor upscales the result by `scale`. No grid lines.
 */
export function renderSpriteSheet(sheet: SpriteSheet, scale: number): PixelGrid {
  const base = makeBlankPixelGrid(sheet.width, sheet.height);
  for (let y = 0; y < sheet.height; y++) {
    for (let x = 0; x < sheet.width; x++) {
      setPixel(base, x, y, sheet.pixels[y * sheet.width + x]!);
    }
  }
  return nearestNeighborUpscale(base, scale);
}

/**
 * Renders a MapGrid by compositing each cell's referenced sprite's actual
 * pixels (looked up in `sheet`'s 16x16 grid of 8x8 sprites) into an 8px
 * block, then nearest-neighbor upscales the composited image by `scale`.
 */
export function renderMap(map: MapGrid, sheet: SpriteSheet, scale: number): PixelGrid {
  const base = makeBlankPixelGrid(map.width * SPRITE_SIZE, map.height * SPRITE_SIZE);
  for (let cellY = 0; cellY < map.height; cellY++) {
    for (let cellX = 0; cellX < map.width; cellX++) {
      const spriteIndex = map.cells[cellY * map.width + cellX]!;
      const spriteOriginX = (spriteIndex % SPRITE_SHEET_COLUMNS) * SPRITE_SIZE;
      const spriteOriginY = Math.floor(spriteIndex / SPRITE_SHEET_COLUMNS) * SPRITE_SIZE;
      for (let row = 0; row < SPRITE_SIZE; row++) {
        for (let col = 0; col < SPRITE_SIZE; col++) {
          const paletteIndex =
            sheet.pixels[(spriteOriginY + row) * sheet.width + (spriteOriginX + col)]!;
          setPixel(
            base,
            cellX * SPRITE_SIZE + col,
            cellY * SPRITE_SIZE + row,
            paletteIndex,
          );
        }
      }
    }
  }
  return nearestNeighborUpscale(base, scale);
}

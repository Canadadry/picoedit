import assert from "node:assert/strict";
import type { PixelGrid } from "./cart-bytes.ts";
import type { PixelImage } from "./cart-data.ts";

const LABEL_WIDTH = 160;
const LABEL_HEIGHT = 205;
const LABEL_PIXEL_COUNT = LABEL_WIDTH * LABEL_HEIGHT;

function assertLabelGridDimensions(grid: {
  width: number;
  height: number;
  channels: number;
}): void {
  assert.equal(grid.width, LABEL_WIDTH, `unexpected pixel grid width ${grid.width}`);
  assert.equal(grid.height, LABEL_HEIGHT, `unexpected pixel grid height ${grid.height}`);
  assert.equal(grid.channels, 4, `unexpected pixel grid channel count ${grid.channels}`);
}

export function decodeLabel(grid: PixelGrid): PixelImage {
  assertLabelGridDimensions(grid);
  const data = grid.data;
  const pixels = Array.from({ length: LABEL_PIXEL_COUNT }, (_, i) => {
    const base = i * 4;
    const r = data[base]!;
    const g = data[base + 1]!;
    const b = data[base + 2]!;
    const a = data[base + 3]!;
    return {
      a: (a >> 2) & 0b111111,
      r: (r >> 2) & 0b111111,
      g: (g >> 2) & 0b111111,
      b: (b >> 2) & 0b111111,
    };
  });
  return { width: LABEL_WIDTH, height: LABEL_HEIGHT, pixels };
}

export function encodeLabel(label: PixelImage, baseGrid: PixelGrid): PixelGrid {
  assert.equal(label.width, LABEL_WIDTH, `PixelImage width must be ${LABEL_WIDTH}, got ${label.width}`);
  assert.equal(label.height, LABEL_HEIGHT, `PixelImage height must be ${LABEL_HEIGHT}, got ${label.height}`);
  assert.equal(
    label.pixels.length,
    LABEL_PIXEL_COUNT,
    `PixelImage must have ${LABEL_PIXEL_COUNT} pixels, got ${label.pixels.length}`,
  );
  assertLabelGridDimensions(baseGrid);
  const data = new Uint8Array(baseGrid.data);
  for (let i = 0; i < LABEL_PIXEL_COUNT; i++) {
    const base = i * 4;
    const pixel = label.pixels[i]!;
    data[base] = (data[base]! & 0b00000011) | (pixel.r << 2);
    data[base + 1] = (data[base + 1]! & 0b00000011) | (pixel.g << 2);
    data[base + 2] = (data[base + 2]! & 0b00000011) | (pixel.b << 2);
    data[base + 3] = (data[base + 3]! & 0b00000011) | (pixel.a << 2);
  }
  return { ...baseGrid, data };
}

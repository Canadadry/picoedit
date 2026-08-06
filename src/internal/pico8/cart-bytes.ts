import { decode as decodePng, encode as encodePng } from "fast-png";
import assert from "node:assert/strict";

export type CartBytes = Uint8Array & { readonly __cartBytesBrand: unique symbol };

export interface PixelGrid {
  width: number;
  height: number;
  channels: number;
  depth: number;
  data: Uint8Array;
}

const CART_WIDTH = 160;
const CART_HEIGHT = 205;
const CART_BYTES_LENGTH = CART_WIDTH * CART_HEIGHT;

function assertCartDimensions(grid: {
  width: number;
  height: number;
  depth: number;
  channels: number;
}): void {
  assert.equal(grid.width, CART_WIDTH, `unexpected PNG width ${grid.width}`);
  assert.equal(grid.height, CART_HEIGHT, `unexpected PNG height ${grid.height}`);
  assert.equal(grid.depth, 8, `unexpected PNG bit depth ${grid.depth}`);
  assert.equal(grid.channels, 4, `unexpected PNG channel count ${grid.channels}`);
}

export function decodePixelGrid(pngBytes: Uint8Array): PixelGrid {
  const png = decodePng(pngBytes);
  assertCartDimensions(png);
  return {
    width: png.width,
    height: png.height,
    channels: png.channels,
    depth: png.depth,
    data: png.data as Uint8Array,
  };
}

export function encodePixelGrid(grid: PixelGrid): Uint8Array {
  return encodePng({
    width: grid.width,
    height: grid.height,
    data: grid.data,
    depth: grid.depth,
    channels: grid.channels,
  });
}

export function extractCartBytes(grid: PixelGrid): CartBytes {
  assertCartDimensions(grid);
  const data = grid.data;
  const bytes = new Uint8Array(CART_BYTES_LENGTH);
  for (let i = 0; i < CART_BYTES_LENGTH; i++) {
    const base = i * 4;
    const r = data[base]!;
    const g = data[base + 1]!;
    const b = data[base + 2]!;
    const a = data[base + 3]!;
    bytes[i] =
      ((a & 0b11) << 6) | ((r & 0b11) << 4) | ((g & 0b11) << 2) | (b & 0b11);
  }
  return bytes as CartBytes;
}

export function injectCartBytes(bytes: CartBytes, baseGrid: PixelGrid): PixelGrid {
  assert.equal(
    bytes.length,
    CART_BYTES_LENGTH,
    `CartBytes must be ${CART_BYTES_LENGTH} bytes, got ${bytes.length}`,
  );
  assertCartDimensions(baseGrid);
  const data = new Uint8Array(baseGrid.data);
  for (let i = 0; i < CART_BYTES_LENGTH; i++) {
    const base = i * 4;
    const byte = bytes[i]!;
    const a2 = (byte >> 6) & 0b11;
    const r2 = (byte >> 4) & 0b11;
    const g2 = (byte >> 2) & 0b11;
    const b2 = byte & 0b11;
    data[base] = (data[base]! & 0b11111100) | r2;
    data[base + 1] = (data[base + 1]! & 0b11111100) | g2;
    data[base + 2] = (data[base + 2]! & 0b11111100) | b2;
    data[base + 3] = (data[base + 3]! & 0b11111100) | a2;
  }
  return { ...baseGrid, data };
}

export function decode(pngBytes: Uint8Array): CartBytes {
  return extractCartBytes(decodePixelGrid(pngBytes));
}

export function encode(bytes: CartBytes, originalPngBytes: Uint8Array): Uint8Array {
  const baseGrid = decodePixelGrid(originalPngBytes);
  const injectedGrid = injectCartBytes(bytes, baseGrid);
  return encodePixelGrid(injectedGrid);
}

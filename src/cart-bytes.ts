import { decode as decodePng, encode as encodePng } from "fast-png";
import assert from "node:assert/strict";

export type CartBytes = Uint8Array & { readonly __cartBytesBrand: unique symbol };

const CART_WIDTH = 160;
const CART_HEIGHT = 205;
const CART_BYTES_LENGTH = CART_WIDTH * CART_HEIGHT;

function assertCartDimensions(png: {
  width: number;
  height: number;
  depth: number;
  channels: number;
}): void {
  assert.equal(png.width, CART_WIDTH, `unexpected PNG width ${png.width}`);
  assert.equal(png.height, CART_HEIGHT, `unexpected PNG height ${png.height}`);
  assert.equal(png.depth, 8, `unexpected PNG bit depth ${png.depth}`);
  assert.equal(png.channels, 4, `unexpected PNG channel count ${png.channels}`);
}

export function decode(pngBytes: Uint8Array): CartBytes {
  const png = decodePng(pngBytes);
  assertCartDimensions(png);
  const data = png.data;
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

export function encode(bytes: CartBytes, originalPngBytes: Uint8Array): Uint8Array {
  assert.equal(
    bytes.length,
    CART_BYTES_LENGTH,
    `CartBytes must be ${CART_BYTES_LENGTH} bytes, got ${bytes.length}`,
  );
  const png = decodePng(originalPngBytes);
  assertCartDimensions(png);
  const data = png.data;
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
  return encodePng({
    width: png.width,
    height: png.height,
    data,
    depth: png.depth,
    channels: png.channels,
  });
}

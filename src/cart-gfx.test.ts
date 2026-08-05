import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CartBytes } from "./cart-bytes.ts";
import { decode as decodeCartBytes } from "./cart-bytes.ts";
import type { SpriteSheet } from "./cart-data.ts";
import { decodeGfx, encodeGfx, GFX_LENGTH, GFX_OFFSET } from "./cart-gfx.ts";

const CART_BYTES_LENGTH = 160 * 205;

const cartDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "cart",
);
const fixtures = readdirSync(cartDir).filter((name) => name.endsWith(".p8.png"));

function makeCartBytesWithGfxByte(byte: number): CartBytes {
  const bytes = new Uint8Array(CART_BYTES_LENGTH);
  bytes[GFX_OFFSET] = byte;
  return bytes as CartBytes;
}

function makeSpriteSheetWithFirstBytePixels(left: number, right: number): SpriteSheet {
  const pixels = new Array(128 * 128).fill(0);
  pixels[0] = left;
  pixels[1] = right;
  return { width: 128, height: 128, pixels } as SpriteSheet;
}

test("decodeGfx unpacks a single byte into its left (low nibble) and right (high nibble) pixels", () => {
  const bytes = makeCartBytesWithGfxByte(0b10100001);
  const sheet = decodeGfx(bytes);
  assert.equal(sheet.width, 128);
  assert.equal(sheet.height, 128);
  assert.equal(sheet.pixels.length, 128 * 128);
  assert.equal(sheet.pixels[0], 0b0001);
  assert.equal(sheet.pixels[1], 0b1010);
});

test("encodeGfx packs a pixel pair back into the same byte", () => {
  const sheet = makeSpriteSheetWithFirstBytePixels(0b0001, 0b1010);
  const encoded = encodeGfx(sheet);
  assert.equal(encoded[0], 0b10100001);
});

test("encodeGfx(decodeGfx(bytes)) is bit-exact against the original gfx bytes for every real fixture", async (t) => {
  assert.ok(fixtures.length > 0, "expected at least one .p8.png fixture in cart/");
  for (const fixture of fixtures) {
    await t.test(fixture, () => {
      const originalPngBytes = readFileSync(path.join(cartDir, fixture));
      const cartBytes = decodeCartBytes(originalPngBytes);
      const originalGfxBytes = cartBytes.subarray(GFX_OFFSET, GFX_OFFSET + GFX_LENGTH);
      const roundTripped = encodeGfx(decodeGfx(cartBytes));
      assert.deepStrictEqual(roundTripped, originalGfxBytes);
    });
  }
});

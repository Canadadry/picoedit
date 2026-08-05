import assert from "node:assert/strict";
import type { CartBytes } from "./cart-bytes.ts";
import type { IntegerRange_0_16, SpriteSheet } from "./cart-data.ts";

export const GFX_OFFSET = 0x0000;
export const GFX_LENGTH = 0x1000;

const SHEET_WIDTH: 128 = 128;
const SHEET_HEIGHT: 128 = 128;
const SHEET_PIXEL_COUNT = SHEET_WIDTH * SHEET_HEIGHT;

function nibbleToPixel(nibble: number): IntegerRange_0_16 {
  return nibble as IntegerRange_0_16;
}

export function decodeGfx(bytes: CartBytes): SpriteSheet {
  const pixels = new Array<IntegerRange_0_16>(SHEET_PIXEL_COUNT).fill(0);
  for (let i = 0; i < GFX_LENGTH; i++) {
    const byte = bytes[GFX_OFFSET + i]!;
    pixels[i * 2] = nibbleToPixel(byte & 0x0f);
    pixels[i * 2 + 1] = nibbleToPixel((byte >> 4) & 0x0f);
  }
  const sheet: SpriteSheet = { width: SHEET_WIDTH, height: SHEET_HEIGHT, pixels };
  assert.equal(
    sheet.pixels.length,
    SHEET_PIXEL_COUNT,
    `decoded gfx has unexpected length ${sheet.pixels.length}`,
  );
  return sheet;
}

export function encodeGfx(sheet: SpriteSheet): Uint8Array {
  assert.equal(
    sheet.pixels.length,
    SHEET_PIXEL_COUNT,
    `SpriteSheet.pixels must be ${SHEET_PIXEL_COUNT} entries, got ${sheet.pixels.length}`,
  );
  const bytes = new Uint8Array(GFX_LENGTH);
  for (let i = 0; i < GFX_LENGTH; i++) {
    const left = sheet.pixels[i * 2]!;
    const right = sheet.pixels[i * 2 + 1]!;
    bytes[i] = ((right << 4) | left) & 0xff;
  }
  return bytes;
}

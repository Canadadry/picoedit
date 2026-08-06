import type { DecodedCart } from "../../internal/pico8/cart.ts";
import type { IntegerRange_0_16 } from "../../internal/pico8/cart-data.ts";

/**
 * The sprite sheet is a 128x128 grid of palette-index pixels (16x16 sprites
 * of 8x8 each). Reading any sprite (0-255) is a plain lookup into
 * `cart.gfx.pixels` (PRD 25 populates that array fully on decode).
 *
 * Writing is not symmetric: `encode()` still serializes sprites 128-255 (the
 * sheet's bottom half, pixel rows 64-127) from `cart.map.cells`, not from
 * `cart.gfx`, because that byte range is shared PICO-8 memory. So a write to
 * a pixel in that range must patch both `cart.gfx.pixels` and the
 * corresponding `cart.map.cells` entries in the same update, or it won't
 * persist through `encode()`'s cart.gfx/cart.map consistency check.
 */

export const SHEET_WIDTH = 128;
export const SHEET_HEIGHT = 128;

const SHARED_REGION_PIXEL_START = 8192;

export interface SpritePixelEdit {
  x: number;
  y: number;
  color: IntegerRange_0_16;
}

export function pixelIndex(x: number, y: number): number {
  return y * SHEET_WIDTH + x;
}

export function isSharedRegionPixel(x: number, y: number): boolean {
  return pixelIndex(x, y) >= SHARED_REGION_PIXEL_START;
}

/** Uniform read: sprites 0-255 all come from cart.gfx.pixels. */
export function getSpritePixel(cart: DecodedCart, x: number, y: number): IntegerRange_0_16 {
  const value = cart.gfx.pixels[pixelIndex(x, y)];
  if (value === undefined) {
    throw new Error(`sprite pixel coordinates out of range: (${x}, ${y})`);
  }
  return value;
}

/**
 * Applies a batch of pixel writes and returns a patch suitable for
 * `updateCart`. Edits inside the shared region (y >= 64) also mirror into
 * `map`, packing both nibbles of each touched byte from the up-to-date
 * pixel values (not just the edited one), so a single-pixel edit doesn't
 * clobber its neighbor's nibble.
 */
export function setSpritePixels(
  cart: DecodedCart,
  edits: readonly SpritePixelEdit[],
): Partial<DecodedCart> {
  const pixels = cart.gfx.pixels.slice();
  const touchedByteIndices = new Set<number>();
  for (const { x, y, color } of edits) {
    const idx = pixelIndex(x, y);
    pixels[idx] = color;
    if (idx >= SHARED_REGION_PIXEL_START) {
      touchedByteIndices.add(Math.floor((idx - SHARED_REGION_PIXEL_START) / 2));
    }
  }

  const gfx = { ...cart.gfx, pixels };
  if (touchedByteIndices.size === 0) {
    return { gfx };
  }

  const cells = cart.map.cells.slice();
  for (const byteIndex of touchedByteIndices) {
    const low = pixels[SHARED_REGION_PIXEL_START + byteIndex * 2]!;
    const high = pixels[SHARED_REGION_PIXEL_START + byteIndex * 2 + 1]!;
    cells[byteIndex] = ((high << 4) | low) & 0xff;
  }
  const map = { ...cart.map, cells };

  return { gfx, map };
}

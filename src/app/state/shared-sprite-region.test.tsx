import type { DecodedCart } from "../../internal/pico8/cart.ts";
import {
  getSpritePixel,
  isSharedMapCell,
  setSpritePixels,
  sharedRegionPixelForMapCell,
} from "./shared-sprite-region.ts";

const SHEET_PIXEL_COUNT = 128 * 128;
const MAP_CELL_COUNT = 128 * 64;

function makeBlankCart(): DecodedCart {
  return {
    gfx: { width: 128, height: 128, pixels: new Array(SHEET_PIXEL_COUNT).fill(0) },
    map: { width: 128, height: 64, cells: new Array(MAP_CELL_COUNT).fill(0) },
  } as DecodedCart;
}

test("getSpritePixel reads the palette index at the given sheet coordinates", () => {
  const cart = makeBlankCart();
  cart.gfx.pixels[5 * 128 + 3] = 7;

  expect(getSpritePixel(cart, 3, 5)).toBe(7);
});

test("setSpritePixels on a sprite-0-127 pixel (y < 64) only patches cart.gfx, leaving map untouched", () => {
  const cart = makeBlankCart();

  const patch = setSpritePixels(cart, [{ x: 10, y: 20, color: 9 }]);

  expect(patch.gfx?.pixels[20 * 128 + 10]).toBe(9);
  expect(patch.map).toBeUndefined();
});

test("setSpritePixels on a shared-region pixel (y >= 64) mirrors the write into cart.map.cells", () => {
  const cart = makeBlankCart();

  const patch = setSpritePixels(cart, [{ x: 10, y: 64, color: 0xa }]);

  expect(patch.gfx?.pixels[64 * 128 + 10]).toBe(0xa);
  expect(patch.map?.cells[5]).toBe(0x0a);
});

test("setSpritePixels packs both nibbles of a shared-region byte when both are set together", () => {
  const cart = makeBlankCart();
  const patch = setSpritePixels(cart, [
    { x: 10, y: 64, color: 0xa },
    { x: 11, y: 64, color: 0xb },
  ]);

  expect(patch.map?.cells[5]).toBe(0xba);
});

test("setSpritePixels preserves the other nibble of a shared byte when only one pixel of the pair changes", () => {
  const cart = makeBlankCart();
  cart.gfx.pixels[64 * 128 + 11] = 0xb;

  const patch = setSpritePixels(cart, [{ x: 10, y: 64, color: 0xa }]);

  expect(patch.map?.cells[5]).toBe(0xba);
});

test("isSharedMapCell is true for cell indices in rows 0-31 (cells 0-4095) and false below", () => {
  expect(isSharedMapCell(0)).toBe(true);
  expect(isSharedMapCell(4095)).toBe(true);
  expect(isSharedMapCell(4096)).toBe(false);
  expect(isSharedMapCell(8191)).toBe(false);
});

test("sharedRegionPixelForMapCell maps map cell index 8 (row 0, col 8) to gfx pixel (16, 64), matching sprite 130's top-left", () => {
  expect(sharedRegionPixelForMapCell(8)).toEqual({ x: 16, y: 64 });
});

test("sharedRegionPixelForMapCell maps map cell index 0 to gfx pixel (0, 64)", () => {
  expect(sharedRegionPixelForMapCell(0)).toEqual({ x: 0, y: 64 });
});

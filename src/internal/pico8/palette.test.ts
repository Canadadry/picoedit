import { test } from "node:test";
import assert from "node:assert/strict";
import { PICO8_PALETTE } from "./palette.ts";

test("PICO8_PALETTE has exactly 16 entries", () => {
  assert.equal(PICO8_PALETTE.length, 16);
});

test("PICO8_PALETTE index 0 is black", () => {
  assert.deepStrictEqual(PICO8_PALETTE[0], [0, 0, 0]);
});

test("PICO8_PALETTE index 8 is PICO-8's default red (#FF004D)", () => {
  assert.deepStrictEqual(PICO8_PALETTE[8], [255, 0, 77]);
});

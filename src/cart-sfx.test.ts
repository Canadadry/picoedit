import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CartBytes } from "./cart-bytes.ts";
import { decode as decodeCartBytes } from "./cart-bytes.ts";
import type { CartData, MapGrid, MusicPattern, PatternChannel, SpriteFlags, SpriteSheet } from "./cart-data.ts";
import { isValid } from "./cart-data.ts";
import { decodeSfx, encodeSfx, SFX_LENGTH, SFX_OFFSET } from "./cart-sfx.ts";

const CART_BYTES_LENGTH = 160 * 205;

const cartDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "cart",
);
const fixtures = readdirSync(cartDir).filter((name) => name.endsWith(".p8.png"));

function makeCartBytesWithFirstNote(low: number, high: number): CartBytes {
  const bytes = new Uint8Array(CART_BYTES_LENGTH);
  bytes[SFX_OFFSET] = low;
  bytes[SFX_OFFSET + 1] = high;
  return bytes as CartBytes;
}

test("decodeSfx unpacks a note's 16 bits into pitch/instrument/volume/effect", () => {
  const bytes = makeCartBytesWithFirstNote(0x65, 0x76);
  const [sfx] = decodeSfx(bytes);
  assert.deepEqual(sfx!.notes[0], {
    pitch: 37,
    instrument: 9,
    volume: 5,
    effect: "drop",
  });
});

test("encodeSfx packs a Note struct back into the same 2 bytes", () => {
  const bytes = makeCartBytesWithFirstNote(0x65, 0x76);
  const sounds = decodeSfx(bytes);
  const encoded = encodeSfx(sounds);
  assert.equal(encoded[0], 0x65);
  assert.equal(encoded[1], 0x76);
});

test("encodeSfx(decodeSfx(bytes)) is bit-exact against the original sfx bytes for every real fixture", async (t) => {
  assert.ok(fixtures.length > 0, "expected at least one .p8.png fixture in cart/");
  for (const fixture of fixtures) {
    await t.test(fixture, () => {
      const originalPngBytes = readFileSync(path.join(cartDir, fixture));
      const cartBytes = decodeCartBytes(originalPngBytes);
      const originalSfxBytes = cartBytes.subarray(SFX_OFFSET, SFX_OFFSET + SFX_LENGTH);
      const roundTripped = encodeSfx(decodeSfx(cartBytes));
      assert.deepStrictEqual(roundTripped, originalSfxBytes);
    });
  }
});

function makeSpriteSheet(): SpriteSheet {
  return { width: 128, height: 128, pixels: Array.from({ length: 128 * 128 }, () => 0) };
}

function makeMapGrid(): MapGrid {
  return { width: 128, height: 64, cells: Array.from({ length: 128 * 64 }, () => 0) };
}

function makeSpriteFlags(): SpriteFlags {
  return {
    flag0: false,
    flag1: false,
    flag2: false,
    flag3: false,
    flag4: false,
    flag5: false,
    flag6: false,
    flag7: false,
  };
}

function makePatternChannel(): PatternChannel {
  return { sfxId: 0, mute: false, flag: false };
}

function makeMusicPattern(): MusicPattern {
  return [
    makePatternChannel(),
    makePatternChannel(),
    makePatternChannel(),
    makePatternChannel(),
  ];
}

test("isValid accepts a CartData built from a real fixture's decoded sfx", () => {
  assert.ok(fixtures.length > 0, "expected at least one .p8.png fixture in cart/");
  const originalPngBytes = readFileSync(path.join(cartDir, fixtures[0]!));
  const cartBytes = decodeCartBytes(originalPngBytes);
  const cart: CartData = {
    lua: "",
    gfx: makeSpriteSheet(),
    gff: Array.from({ length: 256 }, makeSpriteFlags),
    map: makeMapGrid(),
    sfx: decodeSfx(cartBytes),
    music: Array.from({ length: 64 }, makeMusicPattern),
    label: {},
  };
  assert.equal(isValid(cart), true);
});

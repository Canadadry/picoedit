import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CartBytes } from "./cart-bytes.ts";
import { decode as decodeCartBytes } from "./cart-bytes.ts";
import { decodeMusic, encodeMusic, MUSIC_LENGTH, MUSIC_OFFSET } from "./cart-music.ts";

const CART_BYTES_LENGTH = 160 * 205;

const cartDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "cart",
);
const fixtures = readdirSync(cartDir).filter((name) => name.endsWith(".p8.png"));

function makeCartBytesWithFirstPatternByte0(byte: number): CartBytes {
  const bytes = new Uint8Array(CART_BYTES_LENGTH);
  bytes[MUSIC_OFFSET] = byte;
  return bytes as CartBytes;
}

test("decodeMusic unpacks a channel byte's sfxId/mute/flag bits", () => {
  const bytes = makeCartBytesWithFirstPatternByte0(0xa5);
  const [pattern] = decodeMusic(bytes);
  assert.deepEqual(pattern![0], { sfxId: 37, mute: false, flag: true });
});

test("encodeMusic packs a PatternChannel back into the same byte", () => {
  const bytes = makeCartBytesWithFirstPatternByte0(0xa5);
  const patterns = decodeMusic(bytes);
  const encoded = encodeMusic(patterns);
  assert.equal(encoded[0], 0xa5);
});

test("encodeMusic(decodeMusic(bytes)) is bit-exact against the original music bytes for every real fixture", async (t) => {
  assert.ok(fixtures.length > 0, "expected at least one .p8.png fixture in cart/");
  for (const fixture of fixtures) {
    await t.test(fixture, () => {
      const originalPngBytes = readFileSync(path.join(cartDir, fixture));
      const cartBytes = decodeCartBytes(originalPngBytes);
      const originalMusicBytes = cartBytes.subarray(MUSIC_OFFSET, MUSIC_OFFSET + MUSIC_LENGTH);
      const roundTripped = encodeMusic(decodeMusic(cartBytes));
      assert.deepStrictEqual(roundTripped, originalMusicBytes);
    });
  }
});

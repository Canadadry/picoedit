import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CartBytes } from "./cart-bytes.ts";
import { decode as decodeCartBytes } from "./cart-bytes.ts";
import { decodeGff, encodeGff, GFF_LENGTH, GFF_OFFSET } from "./cart-gff.ts";

const CART_BYTES_LENGTH = 160 * 205;

const cartDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "cart",
);
const fixtures = readdirSync(cartDir).filter((name) => name.endsWith(".p8.png"));

function makeCartBytesWithGffByte(byte: number): CartBytes {
  const bytes = new Uint8Array(CART_BYTES_LENGTH);
  bytes[GFF_OFFSET] = byte;
  return bytes as CartBytes;
}

test("decodeGff unpacks a single byte's bits into flag0..flag7 in LSB-to-MSB order", () => {
  const bytes = makeCartBytesWithGffByte(0b10100001);
  const [flags] = decodeGff(bytes);
  assert.deepEqual(flags, {
    flag0: true,
    flag1: false,
    flag2: false,
    flag3: false,
    flag4: false,
    flag5: true,
    flag6: false,
    flag7: true,
  });
});

test("encodeGff packs a SpriteFlags struct back into the same byte", () => {
  const bytes = makeCartBytesWithGffByte(0b10100001);
  const flags = decodeGff(bytes);
  const encoded = encodeGff(flags);
  assert.equal(encoded[0], 0b10100001);
});

test("encodeGff(decodeGff(bytes)) is bit-exact against the original gff bytes for every real fixture", async (t) => {
  assert.ok(fixtures.length > 0, "expected at least one .p8.png fixture in cart/");
  for (const fixture of fixtures) {
    await t.test(fixture, () => {
      const originalPngBytes = readFileSync(path.join(cartDir, fixture));
      const cartBytes = decodeCartBytes(originalPngBytes);
      const originalGffBytes = cartBytes.subarray(GFF_OFFSET, GFF_OFFSET + GFF_LENGTH);
      const roundTripped = encodeGff(decodeGff(cartBytes));
      assert.deepStrictEqual(roundTripped, originalGffBytes);
    });
  }
});

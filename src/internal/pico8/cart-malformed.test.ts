import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CartBytes, PixelGrid } from "./cart-bytes.ts";
import { decode, encode, encodePixelGrid } from "./cart-bytes.ts";
import { verifyHeader } from "./cart-header.ts";
import { decode as decodeCart } from "./cart.ts";

const cartDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "cart",
);
const malformedDir = path.join(cartDir, "malformed");

const SOURCE_FIXTURE = "combo pool.p8.png";
const BAD_SHA1_FIXTURE = "bad-sha1.p8.png";
const BAD_DIMENSIONS_FIXTURE = "bad-dimensions.p8.png";

const SHA1_OFFSET = 0x8006;
const SHA1_LENGTH = 0x8019 - 0x8006 + 1;

function isAllZero(bytes: Uint8Array): boolean {
  return bytes.every((byte) => byte === 0);
}

function generateBadSha1Fixture(): void {
  const target = path.join(malformedDir, BAD_SHA1_FIXTURE);
  if (existsSync(target)) return;
  const originalPngBytes = readFileSync(path.join(cartDir, SOURCE_FIXTURE));
  const cartBytes = decode(originalPngBytes);
  const storedSha1 = cartBytes.subarray(SHA1_OFFSET, SHA1_OFFSET + SHA1_LENGTH);
  // TODO: relies on SOURCE_FIXTURE already carrying a real, non-zero stored SHA1
  assert.ok(!isAllZero(storedSha1), `source fixture ${SOURCE_FIXTURE} has an unset SHA1`);
  const corrupted = new Uint8Array(cartBytes) as CartBytes;
  corrupted[0] = (corrupted[0]! + 1) % 256;
  const corruptedPngBytes = encode(corrupted, originalPngBytes);
  writeFileSync(target, corruptedPngBytes);
}

function generateBadDimensionsFixture(): void {
  const target = path.join(malformedDir, BAD_DIMENSIONS_FIXTURE);
  if (existsSync(target)) return;
  const grid: PixelGrid = {
    width: 160,
    height: 204,
    channels: 4,
    depth: 8,
    data: new Uint8Array(160 * 204 * 4),
  };
  writeFileSync(target, encodePixelGrid(grid));
}

mkdirSync(malformedDir, { recursive: true });
generateBadSha1Fixture();
generateBadDimensionsFixture();

test("verifyHeader throws on a malformed fixture whose data was tampered with but stored SHA1 wasn't recomputed", () => {
  const pngBytes = readFileSync(path.join(malformedDir, BAD_SHA1_FIXTURE));
  const cartBytes = decode(pngBytes);
  assert.throws(() => verifyHeader(cartBytes), /SHA1 mismatch/i);
});

test("decode throws on a malformed fixture with the wrong PNG height", () => {
  const pngBytes = readFileSync(path.join(malformedDir, BAD_DIMENSIONS_FIXTURE));
  assert.throws(() => decode(pngBytes), /height/i);
});

test("decode (cart.ts) throws a SHA1-mismatch error on a malformed fixture whose data was tampered with but stored SHA1 wasn't recomputed", () => {
  const pngBytes = readFileSync(path.join(malformedDir, BAD_SHA1_FIXTURE));
  assert.throws(() => decodeCart(pngBytes), /SHA1 mismatch/i);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CartBytes } from "./cart-bytes.ts";
import { decode } from "./cart-bytes.ts";
import { verifyHeader, writeHeader } from "./cart-header.ts";

const cartDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "cart",
);
const fixtures = readdirSync(cartDir).filter((name) => name.endsWith(".p8.png"));

const CART_BYTES_LENGTH = 160 * 205;
const HASHED_LENGTH = 0x8000;
const SHA1_OFFSET = 0x8006;

function makeCartBytes(): CartBytes {
  const bytes = new Uint8Array(CART_BYTES_LENGTH);
  for (let i = 0; i < HASHED_LENGTH; i++) {
    bytes[i] = (i * 37) % 256;
  }
  return bytes as CartBytes;
}

test("verifyHeader passes when the stored SHA1 matches the first 0x8000 bytes", async () => {
  const bytes = makeCartBytes();
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-1", bytes.subarray(0, HASHED_LENGTH)));
  bytes.set(digest, SHA1_OFFSET);
  await assert.doesNotReject(() => verifyHeader(bytes));
});

test("verifyHeader throws when the stored SHA1 doesn't match", async () => {
  const bytes = makeCartBytes();
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-1", bytes.subarray(0, HASHED_LENGTH)));
  bytes.set(digest, SHA1_OFFSET);
  bytes[0] = (bytes[0]! + 1) % 256;
  await assert.rejects(() => verifyHeader(bytes));
});

test("verifyHeader accepts the CartBytes decoded from every real fixture", async (t) => {
  assert.ok(
    fixtures.length > 0,
    "expected at least one .p8.png fixture in cart/",
  );
  for (const fixture of fixtures) {
    await t.test(fixture, async () => {
      const originalPngBytes = readFileSync(path.join(cartDir, fixture));
      const cartBytes = decode(originalPngBytes);
      await assert.doesNotReject(() => verifyHeader(cartBytes));
    });
  }
});

test("writeHeader recomputes the SHA1 and preserves the version/reserved bytes", async (t) => {
  for (const fixture of fixtures) {
    await t.test(fixture, async () => {
      const originalPngBytes = readFileSync(path.join(cartDir, fixture));
      const cartBytes = decode(originalPngBytes);
      const rewritten = await writeHeader(cartBytes);
      await assert.doesNotReject(() => verifyHeader(rewritten));
      assert.deepStrictEqual(
        rewritten.subarray(0x8000, 0x8006),
        cartBytes.subarray(0x8000, 0x8006),
      );
      assert.deepStrictEqual(
        rewritten.subarray(0x801a, 0x8020),
        cartBytes.subarray(0x801a, 0x8020),
      );
    });
  }
});

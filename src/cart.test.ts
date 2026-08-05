import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decode, encode } from "./cart.ts";

const cartDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "cart",
);
const fixtures = readdirSync(cartDir).filter((name) => name.endsWith(".p8.png"));

test("decode/encode round-trip preserves cart bytes, gff, gfx and map for every real fixture", async (t) => {
  assert.ok(fixtures.length > 0, "expected at least one .p8.png fixture in cart/");
  for (const fixture of fixtures) {
    await t.test(fixture, () => {
      const originalPngBytes = readFileSync(path.join(cartDir, fixture));
      const cart = decode(originalPngBytes);
      const reencodedPngBytes = encode(cart, originalPngBytes);
      const roundTripped = decode(reencodedPngBytes);
      assert.deepStrictEqual(roundTripped.bytes, cart.bytes);
      assert.deepStrictEqual(roundTripped.gff, cart.gff);
      assert.deepStrictEqual(roundTripped.gfx, cart.gfx);
      assert.deepStrictEqual(roundTripped.map, cart.map);
    });
  }
});

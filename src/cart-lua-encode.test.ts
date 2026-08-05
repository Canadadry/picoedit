import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decode as decodeCartBytes } from "./cart-bytes.ts";
import { decodeLua, detectLuaFormat } from "./cart-lua.ts";
import { encodeLua } from "./cart-lua-encode.ts";

const cartDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "cart",
);
const fixtures = readdirSync(cartDir).filter((name) => name.endsWith(".p8.png"));

function roundTrip(text: string): string {
  return decodeLua(detectLuaFormat(makeCartBytesFromLuaBytes(encodeLua(text))));
}

function makeCartBytesFromLuaBytes(luaBytes: Uint8Array) {
  const CART_BYTES_LENGTH = 160 * 205;
  const bytes = new Uint8Array(CART_BYTES_LENGTH);
  bytes.set(luaBytes, 0x4300);
  return bytes as unknown as ReturnType<typeof decodeCartBytes>;
}

test("encodeLua round-trips a short hand-crafted string through decodeLua/detectLuaFormat", () => {
  const original = "print('hello world')\n";
  assert.equal(roundTrip(original), original);
});

test("encodeLua round-trips real fixtures' decoded Lua source through decodeLua/detectLuaFormat", async (t) => {
  assert.ok(fixtures.length > 0, "expected at least one .p8.png fixture in cart/");
  let sawRecentFixture = false;
  for (const fixture of fixtures) {
    await t.test(fixture, () => {
      const bytes = decodeCartBytes(readFileSync(path.join(cartDir, fixture)));
      const format = detectLuaFormat(bytes);
      if (format.kind !== "recent") return;
      sawRecentFixture = true;
      const originalDecodedText = decodeLua(format);
      assert.equal(roundTrip(originalDecodedText), originalDecodedText);
    });
  }
  assert.ok(sawRecentFixture, "expected at least one fixture with recent-format Lua");
});

test("encodeLua keeps a large real fixture's re-encoded output under the 15,360-byte compressed limit", () => {
  let largestFixture: { fixture: string; text: string } | null = null;
  for (const fixture of fixtures) {
    const bytes = decodeCartBytes(readFileSync(path.join(cartDir, fixture)));
    const format = detectLuaFormat(bytes);
    if (format.kind !== "recent") continue;
    const text = decodeLua(format);
    if (!largestFixture || text.length > largestFixture.text.length) {
      largestFixture = { fixture, text };
    }
  }
  assert.ok(largestFixture, "expected at least one fixture with recent-format Lua");
  const encoded = encodeLua(largestFixture!.text);
  const compressedLength = encoded.length - 8;
  assert.ok(
    compressedLength < 15360,
    `${largestFixture!.fixture}: compressed length ${compressedLength} is not under 15,360 bytes`,
  );
});

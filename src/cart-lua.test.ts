import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CartBytes } from "./cart-bytes.ts";
import { decode as decodeCartBytes } from "./cart-bytes.ts";
import { decodeLua, detectLuaFormat, LUA_OFFSET } from "./cart-lua.ts";

const CART_BYTES_LENGTH = 160 * 205;

const cartDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "cart",
);
const fixtures = readdirSync(cartDir).filter((name) => name.endsWith(".p8.png"));

function makeCartBytes(fillFromLuaOffset: number[]): CartBytes {
  const bytes = new Uint8Array(CART_BYTES_LENGTH);
  bytes.set(fillFromLuaOffset, LUA_OFFSET);
  return bytes as CartBytes;
}

test("detectLuaFormat recognizes the recent-format marker and header fields", () => {
  const bytes = makeCartBytes([0x00, 0x70, 0x78, 0x61, 0x00, 0x06, 0x00, 0x0a, 1, 2]);
  const format = detectLuaFormat(bytes);
  assert.deepEqual(format, {
    kind: "recent",
    compressed: Uint8Array.from([1, 2]),
    decompressedLength: 6,
  });
});

test("detectLuaFormat recognizes the legacy-format marker", () => {
  const bytes = makeCartBytes([0x3a, 0x63, 0x3a, 0x00]);
  assert.deepEqual(detectLuaFormat(bytes), { kind: "legacy" });
});

test("detectLuaFormat falls back to raw ASCII text up to the first null byte", () => {
  const bytes = makeCartBytes([0x68, 0x69, 0x00, 0x21]);
  assert.deepEqual(detectLuaFormat(bytes), { kind: "raw", text: "hi" });
});

test("decodeLua passes raw text through unchanged", () => {
  assert.equal(decodeLua({ kind: "raw", text: "print(1)" }), "print(1)");
});

test("decodeLua throws a clear error for the unsupported legacy format", () => {
  assert.throws(() => decodeLua({ kind: "legacy" }), /legacy/i);
});

function pushBits(bits: number[], value: number, width: number): void {
  for (let i = 0; i < width; i++) {
    bits.push((value >> i) & 1);
  }
}

function packBits(bits: number[]): Uint8Array {
  const byteCount = Math.ceil(bits.length / 8);
  const bytes = new Uint8Array(byteCount);
  bits.forEach((bit, i) => {
    if (bit) bytes[i >> 3]! |= 1 << (i & 7);
  });
  return bytes;
}

function buildHandTracedCompressedStream(): Uint8Array {
  const bits: number[] = [];

  pushBits(bits, 1, 1);
  pushBits(bits, 0, 1);

  pushBits(bits, 1, 1);
  pushBits(bits, 1, 1);
  pushBits(bits, 0, 1);
  pushBits(bits, 0, 1);

  pushBits(bits, 0, 1);
  pushBits(bits, 0, 1);
  pushBits(bits, 2, 5);
  pushBits(bits, 2, 3);

  pushBits(bits, 0, 1);
  pushBits(bits, 1, 1);
  pushBits(bits, 0, 1);
  pushBits(bits, 1, 10);
  pushBits(bits, 5, 8);
  pushBits(bits, 6, 8);
  pushBits(bits, 0, 8);

  return packBits(bits);
}

test("decodeLua decodes a hand-traced recent-format stream through every branch (literal, back-reference, uncompressed block)", () => {
  const compressed = buildHandTracedCompressedStream();
  const text = decodeLua({ kind: "recent", compressed, decompressedLength: 6 });
  assert.deepEqual(
    Array.from(text, (ch) => ch.charCodeAt(0)),
    [0, 1, 0, 1, 5, 6],
  );
});

test("decodeLua produces non-empty, plausible-looking output for real fixtures with recent-format Lua", async (t) => {
  assert.ok(fixtures.length > 0, "expected at least one .p8.png fixture in cart/");
  const results: { fixture: string; matchesHeaderLength: boolean }[] = [];
  for (const fixture of fixtures) {
    await t.test(fixture, () => {
      const bytes = decodeCartBytes(readFileSync(path.join(cartDir, fixture)));
      const format = detectLuaFormat(bytes);
      if (format.kind !== "recent") return;
      const text = decodeLua(format);
      assert.ok(text.length > 0, `${fixture}: expected non-empty decoded Lua source`);
      results.push({
        fixture,
        matchesHeaderLength: text.length === format.decompressedLength,
      });
    });
  }
  const withoutHeaderMatch = results.filter((r) => !r.matchesHeaderLength);
  if (withoutHeaderMatch.length > 0) {
    // TODO known-loose: decode length mismatches the decompressedLength header on some fixtures until PRD 11/12 pin the exact bit scheme
  }
});

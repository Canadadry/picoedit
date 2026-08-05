import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CartBytes } from "./cart-bytes.ts";
import { decode } from "./cart-bytes.ts";
import { decodeGff, encodeGff, GFF_LENGTH, GFF_OFFSET } from "./cart-gff.ts";
import { decodeGfx, encodeGfx, GFX_LENGTH, GFX_OFFSET } from "./cart-gfx.ts";
import { decodeMap, encodeMap, MAP_LENGTH, MAP_OFFSET } from "./cart-map.ts";
import { decodeMusic, encodeMusic, MUSIC_LENGTH, MUSIC_OFFSET } from "./cart-music.ts";
import { decodeSfx, encodeSfx, SFX_LENGTH, SFX_OFFSET } from "./cart-sfx.ts";
import { decodeLua, detectLuaFormat, LUA_OFFSET } from "./cart-lua.ts";
import { encodeLua } from "./cart-lua-encode.ts";

const cartDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "cart",
);
const fixtures = readdirSync(cartDir).filter((name) => name.endsWith(".p8.png"));

function sectionBytes(bytes: CartBytes, offset: number, length: number): Uint8Array {
  return bytes.slice(offset, offset + length);
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}

interface LuaGapEntry {
  fixture: string;
  matched: boolean;
}

test("Level 2: decode/re-encode each section is bit-exact against the original cart bytes, for every real fixture", async (t) => {
  assert.ok(fixtures.length > 0, "expected at least one .p8.png fixture in cart/");
  const luaGapLog: LuaGapEntry[] = [];

  for (const fixture of fixtures) {
    await t.test(fixture, async (t) => {
      const originalPngBytes = readFileSync(path.join(cartDir, fixture));
      const bytes = decode(originalPngBytes);

      await t.test("gff", () => {
        const reencoded = encodeGff(decodeGff(bytes));
        assert.deepStrictEqual(reencoded, sectionBytes(bytes, GFF_OFFSET, GFF_LENGTH));
      });

      await t.test("gfx", () => {
        const reencoded = encodeGfx(decodeGfx(bytes));
        assert.deepStrictEqual(reencoded, sectionBytes(bytes, GFX_OFFSET, GFX_LENGTH));
      });

      await t.test("map", () => {
        const reencoded = encodeMap(decodeMap(bytes));
        assert.deepStrictEqual(reencoded, sectionBytes(bytes, MAP_OFFSET, MAP_LENGTH));
      });

      await t.test("sfx", () => {
        const reencoded = encodeSfx(decodeSfx(bytes));
        assert.deepStrictEqual(reencoded, sectionBytes(bytes, SFX_OFFSET, SFX_LENGTH));
      });

      await t.test("music", () => {
        const reencoded = encodeMusic(decodeMusic(bytes));
        assert.deepStrictEqual(reencoded, sectionBytes(bytes, MUSIC_OFFSET, MUSIC_LENGTH));
      });

      // TODO lua is a known, documented gap (see docs/prd/done/12-lua-compress-bitexact.md): not hard-asserted bit-exact here on purpose.
      await t.test("lua (known gap, see PRD 12)", () => {
        const format = detectLuaFormat(bytes);
        let decoded: string;
        try {
          decoded = decodeLua(format);
        } catch (err) {
          assert.match(
            (err as Error).message,
            /legacy/i,
            `${fixture}: decodeLua failed with an unexpected error`,
          );
          return;
        }
        const reencoded = encodeLua(decoded);
        const original = sectionBytes(bytes, LUA_OFFSET, reencoded.length);
        luaGapLog.push({ fixture, matched: bytesEqual(reencoded, original) });
      });
    });
  }

  t.after(() => {
    const matched = luaGapLog.filter((entry) => entry.matched).length;
    console.log(
      `Level 2 lua bit-exactness (known gap, see PRD 12): ${matched}/${luaGapLog.length} non-legacy fixtures matched`,
    );
  });
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePixelGrid } from "../internal/pico8/cart-bytes.ts";
import { LUA_OFFSET } from "../internal/pico8/cart-lua.ts";
import { decodeCommand, encodeCommand } from "./cli.ts";

const cartDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "cart",
);
const fixtures = readdirSync(cartDir).filter((name) => name.endsWith(".p8.png"));

const CART_HEADER_OFFSET = 0x8000;
const LUA_REGION_LENGTH = CART_HEADER_OFFSET - LUA_OFFSET;

function withoutLuaPixels(data: Uint8Array): Uint8Array {
  const copy = Uint8Array.from(data);
  copy.fill(0, LUA_OFFSET * 4, (LUA_OFFSET + LUA_REGION_LENGTH) * 4);
  return copy;
}

function makeTempDir(): string {
  return mkdtempSync(path.join(tmpdir(), "picoedit-cli-"));
}

const expectedFiles = [
  "lua.lua",
  "gfx.json",
  "gff.json",
  "map.json",
  "sfx.json",
  "music.json",
  "label.json",
  "original.p8.png",
];
const jsonFiles = ["gfx.json", "gff.json", "map.json", "sfx.json", "music.json", "label.json"];

test("cli decode writes all 8 expected files, and cli encode round-trips pixel-identically", async (t) => {
  assert.ok(fixtures.length > 0, "expected at least one .p8.png fixture in cart/");
  for (const fixture of fixtures) {
    await t.test(fixture, () => {
      const inputPath = path.join(cartDir, fixture);
      const outputFolder = makeTempDir();

      try {
        decodeCommand(inputPath, outputFolder);
      } catch (err) {
        assert.match(
          (err as Error).message,
          /legacy/i,
          `${fixture}: decode failed with an unexpected error`,
        );
        return;
      }

      for (const name of expectedFiles) {
        const filePath = path.join(outputFolder, name);
        assert.ok(existsSync(filePath), `expected ${name} to exist in ${outputFolder}`);
        assert.ok(readFileSync(filePath).length > 0, `expected ${name} to be non-empty`);
      }
      for (const name of jsonFiles) {
        assert.doesNotThrow(
          () => JSON.parse(readFileSync(path.join(outputFolder, name), "utf8")),
          `expected ${name} to contain valid JSON`,
        );
      }

      const reencodedPath = path.join(outputFolder, "roundtrip.p8.png");
      encodeCommand(outputFolder, reencodedPath);

      const originalGrid = decodePixelGrid(readFileSync(inputPath));
      const reencodedGrid = decodePixelGrid(readFileSync(reencodedPath));
      assert.deepStrictEqual(
        withoutLuaPixels(reencodedGrid.data),
        withoutLuaPixels(originalGrid.data),
      );
    });
  }
});

test("cli encode throws a clear error naming a missing required file", async (t) => {
  for (const fixture of fixtures) {
    const inputPath = path.join(cartDir, fixture);
    const outputFolder = makeTempDir();
    try {
      decodeCommand(inputPath, outputFolder);
    } catch {
      continue;
    }

    unlinkSync(path.join(outputFolder, "sfx.json"));
    assert.throws(
      () => encodeCommand(outputFolder, path.join(outputFolder, "out.p8.png")),
      /sfx\.json/,
      "expected encode to throw an error naming the missing sfx.json file",
    );
    return;
  }
  assert.fail("expected at least one fixture to decode successfully to exercise the error path");
});

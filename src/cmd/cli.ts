import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { CartBytes } from "../internal/pico8/cart-bytes.ts";
import { encodePixelGrid } from "../internal/pico8/cart-bytes.ts";
import type { DecodedCart } from "../internal/pico8/cart.ts";
import { decode, encode } from "../internal/pico8/cart.ts";
import { renderMap, renderSpriteSheet } from "../internal/pico8/render.ts";

const DEFAULT_RENDER_SCALE = 4;

const JSON_FIELDS = ["gff", "gfx", "map", "sfx", "music", "label"] as const;
type JsonField = (typeof JSON_FIELDS)[number];

function requiredFilePath(folder: string, name: string): string {
  const filePath = path.join(folder, name);
  if (!existsSync(filePath)) {
    throw new Error(`encode: missing required file "${name}" in folder "${folder}"`);
  }
  return filePath;
}

export function decodeCommand(
  inputPath: string,
  outputFolder: string,
  scale: number = DEFAULT_RENDER_SCALE,
): void {
  const pngBytes = readFileSync(inputPath);
  const cart = decode(pngBytes);
  mkdirSync(outputFolder, { recursive: true });
  writeFileSync(path.join(outputFolder, "lua.lua"), cart.lua);
  for (const field of JSON_FIELDS) {
    writeFileSync(path.join(outputFolder, `${field}.json`), JSON.stringify(cart[field]));
  }
  writeFileSync(path.join(outputFolder, "original.p8.png"), pngBytes);

  const spritePng = encodePixelGrid(renderSpriteSheet(cart.gfx, scale));
  writeFileSync(path.join(outputFolder, "sprite.png"), spritePng);
  const mapPng = encodePixelGrid(renderMap(cart.map, cart.gfx, scale));
  writeFileSync(path.join(outputFolder, "map.png"), mapPng);
}

export function encodeCommand(folder: string, outputPath: string): void {
  const jsonFilePaths = {} as Record<JsonField, string>;
  for (const field of JSON_FIELDS) {
    jsonFilePaths[field] = requiredFilePath(folder, `${field}.json`);
  }
  const luaFilePath = requiredFilePath(folder, "lua.lua");
  const originalFilePath = requiredFilePath(folder, "original.p8.png");

  const originalPngBytes = readFileSync(originalFilePath);
  const baseCart = decode(originalPngBytes);

  const cart: DecodedCart = {
    bytes: baseCart.bytes as CartBytes,
    lua: readFileSync(luaFilePath, "utf8"),
    gff: JSON.parse(readFileSync(jsonFilePaths.gff, "utf8")),
    gfx: JSON.parse(readFileSync(jsonFilePaths.gfx, "utf8")),
    map: JSON.parse(readFileSync(jsonFilePaths.map, "utf8")),
    sfx: JSON.parse(readFileSync(jsonFilePaths.sfx, "utf8")),
    music: JSON.parse(readFileSync(jsonFilePaths.music, "utf8")),
    label: JSON.parse(readFileSync(jsonFilePaths.label, "utf8")),
  };

  const outputPngBytes = encode(cart, originalPngBytes);
  writeFileSync(outputPath, outputPngBytes);
}

function printUsage(): void {
  console.error(
    "Usage:\n" +
      "  npm run cli -- decode <input.p8.png> <outputFolder> [-s <scale>]\n" +
      "  npm run cli -- encode <folder> <output.p8.png>",
  );
}

/**
 * Hand-parses an optional `-s <value>` token out of the decode subcommand's
 * trailing args (space-separated, e.g. `decode cart.p8.png out/ -s 8`).
 * Returns the default scale when the flag is absent.
 */
function parseDecodeScale(rest: string[]): number {
  const flagIndex = rest.indexOf("-s");
  if (flagIndex === -1) return DEFAULT_RENDER_SCALE;
  const value = rest[flagIndex + 1];
  const scale = Number(value);
  if (!value || !Number.isInteger(scale) || scale <= 0) {
    throw new Error(`decode: -s must be followed by a positive integer, got "${value}"`);
  }
  return scale;
}

function main(argv: string[]): void {
  const [subcommand, arg1, arg2, ...rest] = argv;
  if (subcommand === "decode" && arg1 && arg2) {
    decodeCommand(arg1, arg2, parseDecodeScale(rest));
    return;
  }
  if (subcommand === "encode" && arg1 && arg2) {
    encodeCommand(arg1, arg2);
    return;
  }
  printUsage();
  process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2));
}

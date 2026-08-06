import type { CartBytes } from "./cart-bytes.ts";
import { decodePixelGrid, encodePixelGrid, extractCartBytes, injectCartBytes } from "./cart-bytes.ts";
import type { MapGrid, MusicPattern, PixelImage, Sfx, SpriteFlags, SpriteSheet } from "./cart-data.ts";
import { decodeGff, encodeGff, GFF_OFFSET } from "./cart-gff.ts";
import { decodeGfx, encodeGfx, GFX_OFFSET } from "./cart-gfx.ts";
import { decodeLabel, encodeLabel } from "./cart-label.ts";
import { encodeLua } from "./cart-lua-encode.ts";
import { decodeLua, detectLuaFormat, LUA_OFFSET } from "./cart-lua.ts";
import { decodeMap, encodeMap, MAP_OFFSET } from "./cart-map.ts";
import { decodeMusic, encodeMusic, MUSIC_OFFSET } from "./cart-music.ts";
import { decodeSfx, encodeSfx, SFX_OFFSET } from "./cart-sfx.ts";

const CART_HEADER_OFFSET = 0x8000;
const LUA_REGION_LENGTH = CART_HEADER_OFFSET - LUA_OFFSET;

export interface DecodedCart {
  bytes: CartBytes;
  gff: SpriteFlags[];
  gfx: SpriteSheet;
  lua: string;
  map: MapGrid;
  music: MusicPattern[];
  sfx: Sfx[];
  label: PixelImage;
}

export function decode(pngBytes: Uint8Array): DecodedCart {
  const grid = decodePixelGrid(pngBytes);
  const bytes = extractCartBytes(grid);
  const gff = decodeGff(bytes);
  const gfx = decodeGfx(bytes);
  const lua = decodeLua(detectLuaFormat(bytes));
  const map = decodeMap(bytes);
  const music = decodeMusic(bytes);
  const sfx = decodeSfx(bytes);
  const label = decodeLabel(grid);
  return { bytes, gff, gfx, lua, map, music, sfx, label };
}

export function encode(cart: DecodedCart, originalPngBytes: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(cart.bytes) as CartBytes;
  bytes.set(encodeGff(cart.gff), GFF_OFFSET);
  bytes.set(encodeGfx(cart.gfx), GFX_OFFSET);
  bytes.set(encodeMap(cart.map), MAP_OFFSET);
  bytes.set(encodeMusic(cart.music), MUSIC_OFFSET);
  bytes.set(encodeSfx(cart.sfx), SFX_OFFSET);
  bytes.fill(0, LUA_OFFSET, LUA_OFFSET + LUA_REGION_LENGTH);
  bytes.set(encodeLua(cart.lua), LUA_OFFSET);
  const baseGrid = decodePixelGrid(originalPngBytes);
  const injectedGrid = injectCartBytes(bytes, baseGrid);
  const finalGrid = encodeLabel(cart.label, injectedGrid);
  return encodePixelGrid(finalGrid);
}

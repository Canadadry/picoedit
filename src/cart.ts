import type { CartBytes } from "./cart-bytes.ts";
import { decodePixelGrid, encodePixelGrid, extractCartBytes, injectCartBytes } from "./cart-bytes.ts";
import type { MapGrid, MusicPattern, PixelImage, Sfx, SpriteFlags, SpriteSheet } from "./cart-data.ts";
import { decodeGff, encodeGff, GFF_OFFSET } from "./cart-gff.ts";
import { decodeGfx, encodeGfx, GFX_OFFSET } from "./cart-gfx.ts";
import { decodeLabel, encodeLabel } from "./cart-label.ts";
import { decodeLua, detectLuaFormat } from "./cart-lua.ts";
import { decodeMap, encodeMap, MAP_OFFSET } from "./cart-map.ts";
import { decodeMusic, encodeMusic, MUSIC_OFFSET } from "./cart-music.ts";
import { decodeSfx, encodeSfx, SFX_OFFSET } from "./cart-sfx.ts";

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
  const baseGrid = decodePixelGrid(originalPngBytes);
  const injectedGrid = injectCartBytes(bytes, baseGrid);
  const finalGrid = encodeLabel(cart.label, injectedGrid);
  return encodePixelGrid(finalGrid);
}

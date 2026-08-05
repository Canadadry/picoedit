import type { CartBytes } from "./cart-bytes.ts";
import { decode as decodeCartBytes, encode as encodeCartBytes } from "./cart-bytes.ts";
import type { MapGrid, Sfx, SpriteFlags, SpriteSheet } from "./cart-data.ts";
import { decodeGff, encodeGff, GFF_OFFSET } from "./cart-gff.ts";
import { decodeGfx, encodeGfx, GFX_OFFSET } from "./cart-gfx.ts";
import { decodeMap, encodeMap, MAP_OFFSET } from "./cart-map.ts";
import { decodeSfx, encodeSfx, SFX_OFFSET } from "./cart-sfx.ts";

export interface DecodedCart {
  bytes: CartBytes;
  gff: SpriteFlags[];
  gfx: SpriteSheet;
  map: MapGrid;
  sfx: Sfx[];
}

export function decode(pngBytes: Uint8Array): DecodedCart {
  const bytes = decodeCartBytes(pngBytes);
  const gff = decodeGff(bytes);
  const gfx = decodeGfx(bytes);
  const map = decodeMap(bytes);
  const sfx = decodeSfx(bytes);
  return { bytes, gff, gfx, map, sfx };
}

export function encode(cart: DecodedCart, originalPngBytes: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(cart.bytes) as CartBytes;
  bytes.set(encodeGff(cart.gff), GFF_OFFSET);
  bytes.set(encodeGfx(cart.gfx), GFX_OFFSET);
  bytes.set(encodeMap(cart.map), MAP_OFFSET);
  bytes.set(encodeSfx(cart.sfx), SFX_OFFSET);
  return encodeCartBytes(bytes, originalPngBytes);
}

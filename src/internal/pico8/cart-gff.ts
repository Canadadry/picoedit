import assert from "node:assert/strict";
import type { CartBytes } from "./cart-bytes.ts";
import type { CartData, MusicPattern, PatternChannel, Sfx, SpriteFlags } from "./cart-data.ts";
import { isValid } from "./cart-data.ts";

export const GFF_OFFSET = 0x3000;
export const GFF_LENGTH = 256;

function byteToSpriteFlags(byte: number): SpriteFlags {
  return {
    flag0: (byte & 0b00000001) !== 0,
    flag1: (byte & 0b00000010) !== 0,
    flag2: (byte & 0b00000100) !== 0,
    flag3: (byte & 0b00001000) !== 0,
    flag4: (byte & 0b00010000) !== 0,
    flag5: (byte & 0b00100000) !== 0,
    flag6: (byte & 0b01000000) !== 0,
    flag7: (byte & 0b10000000) !== 0,
  };
}

function spriteFlagsToByte(flags: SpriteFlags): number {
  return (
    (flags.flag0 ? 0b00000001 : 0) |
    (flags.flag1 ? 0b00000010 : 0) |
    (flags.flag2 ? 0b00000100 : 0) |
    (flags.flag3 ? 0b00001000 : 0) |
    (flags.flag4 ? 0b00010000 : 0) |
    (flags.flag5 ? 0b00100000 : 0) |
    (flags.flag6 ? 0b01000000 : 0) |
    (flags.flag7 ? 0b10000000 : 0)
  );
}

function makePlaceholderSfx(): Sfx {
  return {
    notes: Array.from({ length: 32 }, () => ({
      pitch: 0,
      instrument: 0,
      volume: 0,
      effect: "none",
    })),
    editorMode: 0,
    speed: 0,
    loopStart: 0,
    loopEnd: 0,
  };
}

function makePlaceholderMusicPattern(): MusicPattern {
  const channel: PatternChannel = { sfxId: 0, mute: false, flag: false };
  return [channel, channel, channel, channel];
}

export function decodeGff(bytes: CartBytes): SpriteFlags[] {
  const gff = Array.from({ length: GFF_LENGTH }, (_, i) =>
    byteToSpriteFlags(bytes[GFF_OFFSET + i]!),
  );
  const placeholder: CartData = {
    lua: "",
    gfx: {},
    gff,
    map: {},
    sfx: Array.from({ length: 64 }, makePlaceholderSfx),
    music: Array.from({ length: 64 }, makePlaceholderMusicPattern),
    label: {},
  };
  assert.ok(isValid(placeholder), `decoded gff has unexpected length ${gff.length}`);
  return gff;
}

export function encodeGff(flags: SpriteFlags[]): Uint8Array {
  assert.equal(
    flags.length,
    GFF_LENGTH,
    `SpriteFlags[] must be ${GFF_LENGTH} entries, got ${flags.length}`,
  );
  return Uint8Array.from(flags, spriteFlagsToByte);
}

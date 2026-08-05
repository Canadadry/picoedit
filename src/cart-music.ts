import assert from "node:assert/strict";
import type { CartBytes } from "./cart-bytes.ts";
import type { IntegerRange_0_64, MusicPattern, PatternChannel } from "./cart-data.ts";

export const MUSIC_OFFSET = 0x3100;
export const MUSIC_LENGTH = 256;

const PATTERN_COUNT = 64;
const CHANNELS_PER_PATTERN = 4;

function byteToPatternChannel(byte: number): PatternChannel {
  return {
    sfxId: (byte & 0x3f) as IntegerRange_0_64,
    mute: (byte & 0x40) !== 0,
    flag: (byte & 0x80) !== 0,
  };
}

function patternChannelToByte(channel: PatternChannel): number {
  return (channel.sfxId & 0x3f) | (channel.mute ? 0x40 : 0) | (channel.flag ? 0x80 : 0);
}

export function decodeMusic(bytes: CartBytes): MusicPattern[] {
  const patterns = new Array<MusicPattern>(PATTERN_COUNT);
  for (let p = 0; p < PATTERN_COUNT; p++) {
    const base = MUSIC_OFFSET + p * CHANNELS_PER_PATTERN;
    patterns[p] = [
      byteToPatternChannel(bytes[base]!),
      byteToPatternChannel(bytes[base + 1]!),
      byteToPatternChannel(bytes[base + 2]!),
      byteToPatternChannel(bytes[base + 3]!),
    ];
  }
  assert.equal(
    patterns.length,
    PATTERN_COUNT,
    `decoded music has unexpected length ${patterns.length}`,
  );
  return patterns;
}

export function encodeMusic(patterns: MusicPattern[]): Uint8Array {
  assert.equal(
    patterns.length,
    PATTERN_COUNT,
    `MusicPattern[] must be ${PATTERN_COUNT} entries, got ${patterns.length}`,
  );
  const bytes = new Uint8Array(MUSIC_LENGTH);
  for (let p = 0; p < PATTERN_COUNT; p++) {
    const pattern = patterns[p]!;
    assert.equal(
      pattern.length,
      CHANNELS_PER_PATTERN,
      `MusicPattern must be ${CHANNELS_PER_PATTERN} channels, got ${pattern.length}`,
    );
    const base = p * CHANNELS_PER_PATTERN;
    bytes[base] = patternChannelToByte(pattern[0]);
    bytes[base + 1] = patternChannelToByte(pattern[1]);
    bytes[base + 2] = patternChannelToByte(pattern[2]);
    bytes[base + 3] = patternChannelToByte(pattern[3]);
  }
  return bytes;
}

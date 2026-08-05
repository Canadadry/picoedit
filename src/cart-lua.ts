import assert from "node:assert/strict";
import type { CartBytes } from "./cart-bytes.ts";
import type { LuaFormat } from "./cart-data.ts";

export const LUA_OFFSET = 0x4300;

const RECENT_MARKER = [0x00, 0x70, 0x78, 0x61];
const LEGACY_MARKER = [0x3a, 0x63, 0x3a, 0x00];

const MTF_TABLE_SIZE = 256;

function matchesMarker(bytes: CartBytes, marker: number[], offset: number): boolean {
  return marker.every((expected, i) => bytes[offset + i] === expected);
}

function bytesToText(byteValues: number[]): string {
  const chunkSize = 8192;
  let result = "";
  for (let i = 0; i < byteValues.length; i += chunkSize) {
    result += String.fromCharCode(...byteValues.slice(i, i + chunkSize));
  }
  return result;
}

export function detectLuaFormat(bytes: CartBytes): LuaFormat {
  if (matchesMarker(bytes, RECENT_MARKER, LUA_OFFSET)) {
    const decompressedLength = (bytes[LUA_OFFSET + 4]! << 8) | bytes[LUA_OFFSET + 5]!;
    const compressedLengthField = (bytes[LUA_OFFSET + 6]! << 8) | bytes[LUA_OFFSET + 7]!;
    const compressedLength = compressedLengthField - 8;
    assert.ok(compressedLength >= 0, `invalid compressed Lua length field ${compressedLengthField}`);
    const start = LUA_OFFSET + 8;
    const compressed = bytes.slice(start, start + compressedLength);
    return { kind: "recent", compressed, decompressedLength };
  }
  if (matchesMarker(bytes, LEGACY_MARKER, LUA_OFFSET)) {
    return { kind: "legacy" };
  }
  let end = LUA_OFFSET;
  while (end < bytes.length && bytes[end] !== 0) end++;
  const text = bytesToText(Array.from(bytes.slice(LUA_OFFSET, end)));
  return { kind: "raw", text };
}

class BitReader {
  private bitPos = 0;

  constructor(private readonly bytes: Uint8Array) {}

  readBit(): number {
    const byteIndex = this.bitPos >> 3;
    const bitIndex = this.bitPos & 7;
    this.bitPos++;
    if (byteIndex >= this.bytes.length) return 0;
    return (this.bytes[byteIndex]! >> bitIndex) & 1;
  }

  readBits(width: number): number {
    let value = 0;
    for (let i = 0; i < width; i++) {
      value |= this.readBit() << i;
    }
    return value;
  }
}

function readMtfIndex(reader: BitReader): number {
  let n = 0;
  while (reader.readBit() === 1) n++;
  const fixed = n === 0 ? 0 : reader.readBits(n);
  return (1 << n) - 1 + fixed;
}

function readOffsetWidth(reader: BitReader): 5 | 10 | 15 {
  if (reader.readBit() === 0) return 5;
  if (reader.readBit() === 0) return 10;
  return 15;
}

function readLength(reader: BitReader): number {
  let length = 0;
  let group: number;
  do {
    group = reader.readBits(3);
    length += group;
  } while (group === 7);
  return length;
}

function decodeRecent(compressed: Uint8Array, decompressedLength: number): string {
  const reader = new BitReader(compressed);
  const table = Array.from({ length: MTF_TABLE_SIZE }, (_, i) => i);
  const output: number[] = [];
  const maxIterations = decompressedLength + compressed.length * 8 + 4096;
  let iterations = 0;

  while (output.length < decompressedLength && iterations < maxIterations) {
    iterations++;
    const header = reader.readBit();
    if (header === 1) {
      const rawIndex = readMtfIndex(reader);
      const index = ((rawIndex % MTF_TABLE_SIZE) + MTF_TABLE_SIZE) % MTF_TABLE_SIZE;
      const [byte] = table.splice(index, 1) as [number];
      table.unshift(byte);
      output.push(byte);
    } else {
      const width = readOffsetWidth(reader);
      const offset = reader.readBits(width);
      if (width === 10 && offset === 1) {
        for (;;) {
          const byte = reader.readBits(8);
          if (byte === 0) break;
          output.push(byte);
        }
      } else {
        const length = readLength(reader);
        const start = output.length - offset;
        for (let i = 0; i < length; i++) {
          const source = start + i;
          output.push(source >= 0 && source < output.length ? output[source]! : 0);
        }
      }
    }
  }

  while (output.length < decompressedLength) output.push(0);
  return bytesToText(output.slice(0, decompressedLength));
}

export function decodeLua(format: LuaFormat): string {
  if (format.kind === "raw") return format.text;
  if (format.kind === "legacy") {
    throw new Error("unsupported legacy Lua format (see spec §10, out of scope)");
  }
  return decodeRecent(format.compressed, format.decompressedLength);
}

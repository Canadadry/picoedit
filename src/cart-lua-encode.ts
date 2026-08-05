import assert from "node:assert/strict";

const RECENT_MARKER = [0x00, 0x70, 0x78, 0x61];
const MTF_TABLE_SIZE = 256;
const MAX_COMPRESSED_LENGTH = 15360;
const MAX_OFFSET = 32767;
const MIN_MATCH = 3;
const MAX_CHAIN = 64;

class BitWriter {
  private readonly bytes: number[] = [];
  private bitPos = 0;

  writeBit(bit: number): void {
    const byteIndex = this.bitPos >> 3;
    if (byteIndex >= this.bytes.length) this.bytes.push(0);
    if (bit) this.bytes[byteIndex] = this.bytes[byteIndex]! | (1 << (this.bitPos & 7));
    this.bitPos++;
  }

  writeBits(value: number, width: number): void {
    for (let i = 0; i < width; i++) {
      this.writeBit((value >> i) & 1);
    }
  }

  toBytes(): Uint8Array {
    return Uint8Array.from(this.bytes);
  }
}

function writeMtfIndex(writer: BitWriter, index: number): void {
  let n = 0;
  while (index > (1 << (n + 1)) - 2) n++;
  for (let i = 0; i < n; i++) writer.writeBit(1);
  writer.writeBit(0);
  if (n > 0) {
    const fixed = index - ((1 << n) - 1);
    writer.writeBits(fixed, n);
  }
}

function offsetWidthFor(offset: number): 5 | 10 | 15 {
  if (offset <= 31) return 5;
  if (offset <= 1023) return 10;
  return 15;
}

function writeOffsetWidth(writer: BitWriter, width: 5 | 10 | 15): void {
  if (width === 5) {
    writer.writeBit(0);
    return;
  }
  writer.writeBit(1);
  if (width === 10) {
    writer.writeBit(0);
    return;
  }
  writer.writeBit(1);
}

function writeLength(writer: BitWriter, length: number): void {
  let remaining = length;
  let group: number;
  do {
    group = Math.min(remaining, 7);
    writer.writeBits(group, 3);
    remaining -= group;
  } while (group === 7);
}

function hash3(bytes: number[], i: number): number {
  return (bytes[i]! << 16) | (bytes[i + 1]! << 8) | bytes[i + 2]!;
}

function findBestMatch(
  bytes: number[],
  i: number,
  n: number,
  chains: Map<number, number>,
  prev: Int32Array,
): { offset: number; length: number } | null {
  if (i + MIN_MATCH > n) return null;
  const key = hash3(bytes, i);
  let candidate = chains.get(key);
  let bestLength = 0;
  let bestOffset = 0;
  let chainCount = 0;
  while (candidate !== undefined && candidate >= 0 && chainCount < MAX_CHAIN) {
    const offset = i - candidate;
    if (offset > MAX_OFFSET) break;
    let length = 0;
    const maxLength = n - i;
    while (length < maxLength && bytes[i + length] === bytes[i + length - offset]) {
      length++;
    }
    if (length > bestLength) {
      bestLength = length;
      bestOffset = offset;
    }
    chainCount++;
    candidate = prev[candidate];
  }
  if (bestLength < MIN_MATCH) return null;
  return { offset: bestOffset, length: bestLength };
}

function compress(bytes: number[]): Uint8Array {
  const n = bytes.length;
  const writer = new BitWriter();
  const table = Array.from({ length: MTF_TABLE_SIZE }, (_, i) => i);

  const chains = new Map<number, number>();
  const prev = new Int32Array(n).fill(-1);

  function insertHash(pos: number): void {
    if (pos + MIN_MATCH > n) return;
    const key = hash3(bytes, pos);
    prev[pos] = chains.get(key) ?? -1;
    chains.set(key, pos);
  }

  let hashInserted = 0;
  let i = 0;
  while (i < n) {
    while (hashInserted < i) {
      insertHash(hashInserted);
      hashInserted++;
    }

    const match = findBestMatch(bytes, i, n, chains, prev);
    if (match) {
      writer.writeBit(0);
      const width = offsetWidthFor(match.offset);
      writeOffsetWidth(writer, width);
      writer.writeBits(match.offset, width);
      writeLength(writer, match.length);
      i += match.length;
    } else {
      const byte = bytes[i]!;
      const index = table.indexOf(byte);
      const [found] = table.splice(index, 1) as [number];
      table.unshift(found);
      writer.writeBit(1);
      writeMtfIndex(writer, index);
      i += 1;
    }
  }

  return writer.toBytes();
}

export function encodeLua(text: string): Uint8Array {
  const bytes: number[] = new Array(text.length);
  for (let i = 0; i < text.length; i++) {
    bytes[i] = text.charCodeAt(i) & 0xff;
  }

  const compressed = compress(bytes);
  assert.ok(
    compressed.length <= MAX_COMPRESSED_LENGTH,
    `compressed Lua code is ${compressed.length} bytes, exceeding the ${MAX_COMPRESSED_LENGTH}-byte limit; shorten the source`,
  );

  const decompressedLength = bytes.length;
  assert.ok(
    decompressedLength <= 0xffff,
    `decompressed Lua code is ${decompressedLength} bytes, exceeding the 16-bit length field limit`,
  );

  const lengthField = compressed.length + 8;
  const result = new Uint8Array(8 + compressed.length);
  result.set(RECENT_MARKER, 0);
  result[4] = (decompressedLength >> 8) & 0xff;
  result[5] = decompressedLength & 0xff;
  result[6] = (lengthField >> 8) & 0xff;
  result[7] = lengthField & 0xff;
  result.set(compressed, 8);
  return result;
}

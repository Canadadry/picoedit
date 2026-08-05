import assert from "node:assert/strict";

const RECENT_MARKER = [0x00, 0x70, 0x78, 0x61];
const MTF_TABLE_SIZE = 256;
const MAX_COMPRESSED_LENGTH = 15360;
const MAX_OFFSET = 32767;
const MIN_MATCH = 3;
const MAX_CHAIN = 8192;

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
  while (index >= 16 * ((1 << (n + 1)) - 1)) n++;
  const base = 16 * ((1 << n) - 1);
  for (let i = 0; i < n; i++) writer.writeBit(1);
  writer.writeBit(0);
  writer.writeBits(index - base, 4 + n);
}

function offsetWidthFor(offset: number): 5 | 10 | 15 {
  // TODO offset==1 always lands in the <=32 branch (width 5); width 10 with a raw
  // TODO field of 0 (offset 1) is reserved as the uncompressed-block escape sentinel.
  if (offset <= 32) return 5;
  if (offset <= 1024) return 10;
  return 15;
}

function writeOffsetWidth(writer: BitWriter, width: 5 | 10 | 15): void {
  if (width === 15) {
    writer.writeBit(0);
    return;
  }
  writer.writeBit(1);
  writer.writeBit(width === 5 ? 1 : 0);
}

function writeLength(writer: BitWriter, length: number): void {
  let remaining = length - 3;
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

function matchBitCost(offset: number, length: number): number {
  const width = offsetWidthFor(offset);
  const selectorBits = width === 15 ? 1 : 2;
  let remaining = length - 3;
  let lengthBits = 0;
  let group: number;
  do {
    group = Math.min(remaining, 7);
    lengthBits += 3;
    remaining -= group;
  } while (group === 7);
  return 1 + selectorBits + width + lengthBits;
}

// TODO rough per-byte cost estimate for an MTF-encoded literal, used both as the DP's
// TODO literal edge weight and to reject back-references costlier than encoding literally
const LITERAL_BIT_ESTIMATE = 7;

interface MatchCandidate {
  offset: number;
  length: number;
}

// TODO returns at most one candidate per offset-width class (5/10/15 bits), each the
// TODO longest match found within that class, so the DP below can pick whichever
// TODO class trades offset-field width against match length most cheaply
function findMatchesByClass(
  bytes: number[],
  i: number,
  n: number,
  chains: Map<number, number>,
  prev: Int32Array,
): MatchCandidate[] {
  if (i + MIN_MATCH > n) return [];
  const key = hash3(bytes, i);
  let candidate = chains.get(key);
  const bestByWidth = new Map<5 | 10 | 15, MatchCandidate>();
  let chainCount = 0;
  while (candidate !== undefined && candidate >= 0 && chainCount < MAX_CHAIN) {
    const offset = i - candidate;
    if (offset > MAX_OFFSET) break;
    let length = 0;
    const maxLength = n - i;
    while (length < maxLength && bytes[i + length] === bytes[i + length - offset]) {
      length++;
    }
    if (length >= MIN_MATCH) {
      const width = offsetWidthFor(offset);
      const existing = bestByWidth.get(width);
      if (!existing || length > existing.length) bestByWidth.set(width, { offset, length });
    }
    chainCount++;
    candidate = prev[candidate];
  }
  return Array.from(bestByWidth.values());
}

interface ParseEdge {
  length: number;
  cost: number;
  offset: number;
}

function compress(bytes: number[]): Uint8Array {
  const n = bytes.length;
  const writer = new BitWriter();

  const chains = new Map<number, number>();
  const prev = new Int32Array(n).fill(-1);

  function insertHash(pos: number): void {
    if (pos + MIN_MATCH > n) return;
    const key = hash3(bytes, pos);
    prev[pos] = chains.get(key) ?? -1;
    chains.set(key, pos);
  }

  const edges: ParseEdge[][] = new Array(n);
  for (let i = 0; i < n; i++) {
    const list: ParseEdge[] = [{ length: 1, cost: LITERAL_BIT_ESTIMATE, offset: -1 }];
    for (const c of findMatchesByClass(bytes, i, n, chains, prev)) {
      const cost = matchBitCost(c.offset, c.length);
      if (cost < c.length * LITERAL_BIT_ESTIMATE) {
        list.push({ length: c.length, cost, offset: c.offset });
      }
    }
    edges[i] = list;
    insertHash(i);
  }

  const dp = new Float64Array(n + 1).fill(Infinity);
  const chosenLength = new Int32Array(n + 1);
  const chosenOffset = new Int32Array(n + 1).fill(-1);
  dp[n] = 0;
  for (let i = n - 1; i >= 0; i--) {
    let best = Infinity;
    let bestLength = 1;
    let bestOffset = -1;
    for (const edge of edges[i]!) {
      const total = edge.cost + dp[i + edge.length]!;
      if (total < best) {
        best = total;
        bestLength = edge.length;
        bestOffset = edge.offset;
      }
    }
    dp[i] = best;
    chosenLength[i] = bestLength;
    chosenOffset[i] = bestOffset;
  }

  const table = Array.from({ length: MTF_TABLE_SIZE }, (_, i) => i);
  let i = 0;
  while (i < n) {
    const length = chosenLength[i]!;
    const offset = chosenOffset[i]!;
    if (offset >= 0) {
      writer.writeBit(0);
      const width = offsetWidthFor(offset);
      writeOffsetWidth(writer, width);
      writer.writeBits(offset - 1, width);
      writeLength(writer, length);
      i += length;
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

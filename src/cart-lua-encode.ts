import assert from "node:assert/strict";

const RECENT_MARKER = [0x00, 0x70, 0x78, 0x61];
const MTF_TABLE_SIZE = 256;
// TODO structural ceiling, not PICO-8's advisory 15,360 figure: Lua region is 0x4300-0x7fff (15616 bytes) minus the 8-byte recent-format header
const MAX_COMPRESSED_LENGTH = 15608;
const MAX_OFFSET = 32767;
const MIN_MATCH = 3;
const RAW_BLOCK_WINDOW = 32;

class BitWriter {
  private readonly bits: number[] = [];

  writeBit(bit: number): void {
    this.bits.push(bit & 1);
  }

  writeBits(value: number, width: number): void {
    for (let i = 0; i < width; i++) {
      this.writeBit((value >> i) & 1);
    }
  }

  get length(): number {
    return this.bits.length;
  }

  // TODO rewinds the write position so the periodic raw-block pass (see docs/prd12-compressor-research-findings.md §5) can overwrite already-emitted bits
  truncate(bitPos: number): void {
    this.bits.length = bitPos;
  }

  toBytes(): Uint8Array {
    const byteLength = Math.ceil(this.bits.length / 8);
    const out = new Uint8Array(byteLength);
    for (let i = 0; i < this.bits.length; i++) {
      if (this.bits[i]) out[i >> 3]! |= 1 << (i & 7);
    }
    return out;
  }
}

function mtfGroupN(index: number): number {
  let n = 0;
  while (index >= 16 * ((1 << (n + 1)) - 1)) n++;
  return n;
}

function writeMtfIndex(writer: BitWriter, index: number): void {
  const n = mtfGroupN(index);
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

// TODO PICO-8's own (lossy) 3-byte hash, replicated exactly so bucket contents (and
// TODO thus search order/results) match the reference compressor's, per research findings §2
function miniHash(bytes: number[], i: number): number {
  return (bytes[i]! * 7 + bytes[i + 1]! * 1503 + bytes[i + 2]! * 51717) & 4095;
}

function distGroups(dist: number): number {
  let groups = 0;
  let d = dist;
  while (d > 0) {
    groups++;
    d >>= 5;
  }
  return groups;
}

interface MatchCandidate {
  length: number;
  offset: number;
  score: number;
}

function compress(bytes: number[]): Uint8Array {
  const n = bytes.length;
  const writer = new BitWriter();

  const buckets = new Map<number, number[]>();
  for (let i = 0; i + 2 < n; i++) {
    const h = miniHash(bytes, i);
    let list = buckets.get(h);
    if (!list) {
      list = [];
      buckets.set(h, list);
    }
    list.push(i);
  }

  function findBestMatch(pos: number): MatchCandidate | null {
    const maxLen = n - pos;
    if (maxLen < MIN_MATCH || pos + 2 >= n) return null;
    const list = buckets.get(miniHash(bytes, pos));
    if (!list) return null;

    let bestScore = 0;
    let bestLength = 0;
    let bestOffset = 0;
    for (const pos0 of list) {
      if (pos0 >= pos) break;
      if (pos0 < pos - MAX_OFFSET) continue;
      let i = 0;
      while (i < maxLen && pos0 + i < pos && bytes[pos0 + i] === bytes[pos + i]) i++;
      while (i < maxLen && pos0 + i >= pos && bytes[pos0 + (i % (pos - pos0))] === bytes[pos + i]) i++;
      const dist = pos - pos0;
      const groups = distGroups(dist);
      const bitCost = Math.min(groups, 2) + groups * 5 + 3 + 1;
      const score = Math.floor((i * 256) / bitCost);
      if (score > bestScore) {
        bestScore = score;
        bestLength = i;
        bestOffset = dist;
      }
    }
    if (bestLength === 0) return null;
    return { length: bestLength, offset: bestOffset, score: bestScore };
  }

  let mtf = Array.from({ length: MTF_TABLE_SIZE }, (_, i) => i);
  let mtfBackup = mtf.slice();
  let storedLastSegmentAsRaw = false;
  let rawPosSrc0 = 0;
  let rawPosSrc = 0;
  let rawPosDestBits = 0;

  let pos = 0;
  while (pos < n) {
    const c = bytes[pos]!;
    const lpos = mtf.indexOf(c);
    const literalCost = 6 + 2 * mtfGroupN(lpos);
    const literalScore = Math.floor(256 / literalCost);

    const match = findBestMatch(pos);
    const blockLen = match?.length ?? 0;
    const blockOffset = match?.offset ?? 0;
    let blockScore = match?.score ?? 0;

    if (blockLen >= MIN_MATCH && blockScore > literalScore && blockScore < 128) {
      for (const ii of [1, 2]) {
        const lookahead = findBestMatch(pos + ii);
        const score2 = lookahead?.score ?? 0;
        if (score2 > Math.floor((blockScore * 6) / 5)) {
          blockScore = 0;
          break;
        }
      }
    }

    if (blockLen >= MIN_MATCH && blockScore > literalScore) {
      writer.writeBit(0);
      const width = offsetWidthFor(blockOffset);
      writeOffsetWidth(writer, width);
      writer.writeBits(blockOffset - 1, width);
      writeLength(writer, blockLen);
      pos += blockLen;
    } else {
      writer.writeBit(1);
      writeMtfIndex(writer, lpos);
      const [moved] = mtf.splice(lpos, 1) as [number];
      mtf.unshift(moved);
      pos += 1;
    }

    const destBytePos = writer.length >>> 3;
    const rawPosDestBytePos = rawPosDestBits >>> 3;
    if (destBytePos - rawPosDestBytePos >= RAW_BLOCK_WINDOW || pos === n) {
      const compressedSize = destBytePos - rawPosDestBytePos;
      const rawSize = pos - rawPosSrc;
      const margin = rawPosSrc0 === rawPosSrc ? 3 : 0;
      if (compressedSize > rawSize + margin) {
        if (!storedLastSegmentAsRaw) {
          writer.truncate(rawPosDestBits);
          writer.writeBit(0);
          writer.writeBit(1);
          writer.writeBit(0);
          writer.writeBits(0, 10);
        } else {
          writer.truncate(rawPosDestBits - 8);
        }
        for (let k = 0; k < rawSize; k++) writer.writeBits(bytes[rawPosSrc + k]!, 8);
        writer.writeBits(0, 8);
        storedLastSegmentAsRaw = true;
        mtf = mtfBackup.slice();
      } else {
        storedLastSegmentAsRaw = false;
        rawPosSrc0 = pos;
        mtfBackup = mtf.slice();
      }
      rawPosDestBits = writer.length;
      rawPosSrc = pos;
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

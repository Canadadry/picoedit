import assert from "node:assert/strict";
import type { CartBytes } from "./cart-bytes.ts";

const HASHED_LENGTH = 0x8000;
const SHA1_OFFSET = 0x8006;
const SHA1_LENGTH = 0x8019 - 0x8006 + 1;
const UNSET_SHA1 = new Uint8Array(SHA1_LENGTH);

async function computeSha1(bytes: CartBytes): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-1", bytes.subarray(0, HASHED_LENGTH));
  return new Uint8Array(digest);
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((byte, i) => byte === b[i]);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyHeader(bytes: CartBytes): Promise<void> {
  const stored = bytes.subarray(SHA1_OFFSET, SHA1_OFFSET + SHA1_LENGTH);
  // TODO: an all-zero stored SHA1 is left unverified rather than treated as a mismatch —
  if (bytesEqual(stored, UNSET_SHA1)) {
    return;
  }
  const computed = await computeSha1(bytes);
  assert.ok(
    bytesEqual(stored, computed),
    `cart header SHA1 mismatch: expected ${toHex(computed)}, got ${toHex(stored)}`,
  );
}

export async function writeHeader(bytes: CartBytes): Promise<CartBytes> {
  const computed = await computeSha1(bytes);
  const out = new Uint8Array(bytes) as CartBytes;
  out.set(computed, SHA1_OFFSET);
  return out;
}

import { test } from "node:test";
import assert from "node:assert/strict";
import { sha1 } from "./sha1.ts";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

test("sha1 of the empty string matches the standard test vector", () => {
  const digest = sha1(utf8(""));
  assert.equal(toHex(digest), "da39a3ee5e6b4b0d3255bfef95601890afd80709");
});

test('sha1 of "abc" matches the standard test vector', () => {
  const digest = sha1(utf8("abc"));
  assert.equal(toHex(digest), "a9993e364706816aba3e25717850c26c9cd0d89d");
});

test("sha1 of a message spanning multiple 64-byte blocks matches the standard test vector", () => {
  const digest = sha1(utf8("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"));
  assert.equal(toHex(digest), "84983e441c3bd26ebaae4aa1f95129e5e54670f1");
});

test("sha1 returns a 20-byte Uint8Array digest", () => {
  const digest = sha1(utf8("picoedit"));
  assert.equal(digest.length, 20);
  assert.ok(digest instanceof Uint8Array);
});

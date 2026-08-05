---
title: "music section: music patterns"
description: "Decode 64 patterns x 4 bytes at 0x3100 into MusicPattern[] (one PatternChannel per byte) and re-encode them back to bytes."
status: done
---

## Problem Statement

Nothing decodes the music bytes into the `MusicPattern[]` shape `CartData.music` requires. Each pattern is 4 bytes (one per channel), each byte bit-packing an sfx id, a mute flag, and a position-dependent playback-control flag, per spec §8.4.

## Solution

Implement `decodeMusic(bytes: CartBytes): MusicPattern[]` / `encodeMusic(patterns: MusicPattern[]): Uint8Array` (256 bytes), unpacking/packing each byte's `sfxId` (bits 0-5), `mute` (bit 6), and `flag` (bit 7, whose meaning — loop start/loop end/stop/unused — depends on the channel's position within the pattern per §8.4, but is stored uniformly as `flag` on `PatternChannel`).

## User Stories

1. As a developer decoding a cart, I want the 64 patterns turned into `MusicPattern[]` (4-channel tuples), so that I can read e.g. `cart.music[2][0].sfxId` instead of manually bit-testing a raw byte.
2. As a developer compacting a cart, I want `encodeMusic` to pack `MusicPattern[]` back into exactly the 256 bytes PICO-8 expects at 0x3100, bit-for-bit.
3. As a developer round-tripping decode then encode on a real fixture, I want the output bytes identical to the input, since this section is a fixed, lossless 1:1 layout.

## Implementation Decisions

- `PatternChannel.flag`'s semantic meaning (loop-start/loop-end/stop/unused) is purely positional (byte 0/1/2/3 within the pattern) and is not re-interpreted or renamed per-position in the type — `flag` stays one generic boolean field, with the positional meaning documented in a comment (per spec §8.4), not encoded as 4 differently-named fields, since `MusicPattern` is already a positional 4-tuple.
- `decode`'s return type gains a `music: MusicPattern[]` field; `encode`'s input grows the same field.

## Testing Decisions

- Unit test: hand-crafted byte decodes to expected `{sfxId, mute, flag}`; inverse `encodeMusic` of that channel produces the same byte.
- Integration test: for a real fixture, `encodeMusic(decodeMusic(bytes))` is bit-exact against `bytes` over `0x3100-0x31FF`.
- Step 01's Level 1 pixel round-trip test must still pass unmodified.

## Out of Scope

- Text-file serialization — generic `JSON.stringify`.
- Actual playback logic (loop start/end/stop interpretation) — this step only decodes/encodes the raw flag bit, it doesn't simulate playback.

## Further Notes

None.

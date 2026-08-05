---
title: "sfx section: sound effects"
description: "Decode 64 sounds x 68 bytes at 0x3200 into Sfx[] (32 bit-packed notes + 4 metadata bytes each) and re-encode them back to bytes."
status: needs-triage
---

## Problem Statement

Nothing decodes the sfx bytes into the `Sfx[]` shape `CartData.sfx` requires. Each sound is 32 notes (2 bytes each, bit-packed pitch/instrument/volume/effect) plus 4 metadata bytes, per spec §8.3.

## Solution

Implement `decodeSfx(bytes: CartBytes): Sfx[]` / `encodeSfx(sounds: Sfx[]): Uint8Array` (4352 bytes), unpacking/packing each 16-bit note (6-bit pitch, 4-bit instrument, 3-bit volume, 3-bit effect) and the 4 metadata bytes per sound.

## User Stories

1. As a developer decoding a cart, I want the 64 sounds turned into `Sfx[]` with named, typed note fields, so that I can read `cart.sfx[3].notes[5].pitch` instead of manually bit-shifting a raw 16-bit value.
2. As a developer compacting a cart, I want `encodeSfx` to pack `Sfx[]` back into exactly the 4352 bytes PICO-8 expects at 0x3200, bit-for-bit.
3. As a developer round-tripping decode then encode on a real fixture, I want the output bytes identical to the input, since this section is a fixed, lossless 1:1 layout.
4. As a developer reading a decoded note's `effect` field, I want one of the 8 named `Effect` string values, so that I don't have to remember which raw 3-bit number means "vibrato".

## Implementation Decisions

- Note bit layout per spec §8.3: bits 0-5 pitch, bits 6-9 instrument, bits 10-12 volume, bits 13-15 effect (6+4+3+3 = 16 bits).
- `Effect` order: `none, slide, vibrato, drop, fade_in, fade_out, arp_fast, arp_slow` mapped to raw values 0-7 respectively, per spec §8.3's listed order.
- The 4 metadata bytes map to `editorMode`, `speed`, `loopStart`, `loopEnd` (plain `number`, unconstrained per the earlier decision not to pin down their exact valid ranges).
- `decode`'s return type gains an `sfx: Sfx[]` field; `encode`'s input grows the same field.

## Testing Decisions

- Unit test: hand-crafted 2-byte note value decodes to expected `{pitch, instrument, volume, effect}`; inverse `encodeSfx` of that note produces the same 2 bytes.
- Integration test: for a real fixture, `encodeSfx(decodeSfx(bytes))` is bit-exact against `bytes` over `0x3200-0x42FF`.
- `isValid` sanity check: a real fixture's decoded `Sfx[]` passes `isValid`'s length/range checks from step 02.
- Step 01's Level 1 pixel round-trip test must still pass unmodified.

## Out of Scope

- Text-file serialization — generic `JSON.stringify`.

## Further Notes

None.

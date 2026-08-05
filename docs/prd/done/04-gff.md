---
title: "gff section: sprite flags"
description: "Decode 256 bytes at 0x3000 into 256 SpriteFlags structs (8 named booleans each) and re-encode them back to bytes."
status: done
---

## Problem Statement

Nothing decodes the sprite-flags region of cart bytes into the `SpriteFlags[]` shape `CartData.gff` requires, or re-encodes it back.

## Solution

Implement `decodeGff(bytes: CartBytes): SpriteFlags[]` and `encodeGff(flags: SpriteFlags[]): Uint8Array` (256 bytes), unpacking/packing each byte's 8 bits into/from the named `flag0..flag7` booleans.

## User Stories

1. As a developer decoding a cart, I want the 256 sprite-flag bytes turned into 256 `SpriteFlags` structs with named booleans, so that I can read e.g. `cart.gff[12].flag0` instead of manually bit-testing a raw integer.
2. As a developer compacting a cart, I want `encodeGff` to pack `SpriteFlags[]` back into exactly the 256 bytes PICO-8 expects at 0x3000, bit-for-bit.
3. As a developer round-tripping decode then encode on a real fixture's gff bytes, I want the output to be byte-identical to the input, since this section has a fixed, lossless 1:1 binary layout.

## Implementation Decisions

- Bit-to-boolean order (which bit is `flag0` vs `flag7`) follows the natural LSB-to-MSB order of each byte: bit 0 = `flag0` ... bit 7 = `flag7`.
- `decodeGff`'s output length (256) is checked using the same invariant `isValid` (step 02) centralizes, not duplicated ad hoc.
- This is the first step where `decode`'s return type grows beyond the flat `CartBytes` from step 01: it gains a `gff: SpriteFlags[]` field, decoded from the same underlying `CartBytes` step 01 already extracts. `encode`'s corresponding parameter grows symmetrically — its input now needs a `gff` field it packs back into the assembled `CartBytes` before delegating to step 01's pixel-injection logic.

## Testing Decisions

- Unit test: hand-crafted single byte (e.g. `0b10100001`) decodes to the expected `SpriteFlags` struct; the inverse `encodeGff` of that struct produces the same byte.
- Integration test: for a real fixture, `encodeGff(decodeGff(bytes))` is bit-exact against `bytes` (per spec §7 Level 2 — trivial for this section since it's a fixed 1:1 layout).
- Step 01's Level 1 pixel round-trip test must still pass unmodified — this step only changes what `decode`/`encode` expose in their typed layer, not the underlying byte-for-byte pixel behavior.

## Out of Scope

- Any text-file serialization of `SpriteFlags[]` — the JSON serialization decided earlier is generic (`JSON.stringify`) and needs no per-section work.

## Further Notes

Good first section to implement — simplest binary layout, establishes the per-section pattern (decode/encode pair + bit-exact round-trip test, plus growing `decode`/`encode`'s shared type by exactly one field) later sections follow.

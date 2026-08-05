---
title: "gfx section: sprite sheet"
description: "Decode the top 4KB (0x0000-0x0FFF, sprites 0-127) of the sprite sheet into a SpriteSheet structure and re-encode it back to bytes."
status: needs-triage
---

## Problem Statement

Nothing decodes the packed 4-bit-per-pixel sprite sheet bytes into a usable structure, or re-encodes one back. This section only covers `0x0000-0x0FFF` — the shared `0x1000-0x1FFF` region belongs to the map section (step 06) per spec §8.1's note that `map` is self-contained over `0x1000-0x2FFF`.

## Solution

Define the real `SpriteSheet` type (superseding the placeholder from step 02) and implement `decodeGfx(bytes: CartBytes): SpriteSheet` / `encodeGfx(sheet: SpriteSheet): Uint8Array` (4096 bytes) for sprites 0-127 only.

## User Stories

1. As a developer decoding a cart, I want the top sprite sheet bytes turned into a `SpriteSheet` of per-pixel color indices, so that I can inspect/render sprites 0-127 without manual nibble unpacking.
2. As a developer compacting a cart, I want `encodeGfx` to pack a `SpriteSheet` back into exactly the 4096 bytes PICO-8 expects, bit-for-bit.
3. As a developer round-tripping decode then encode on a real fixture, I want the output bytes to be identical to the input, since this section is a fixed, lossless 1:1 layout (each nibble ↔ one color index).

## Implementation Decisions

- `SpriteSheet { width: 128; height: 128; pixels: IntegerRange_0_16[] }` (128×128 = 16,384 entries, row-major), superseding the step-02 placeholder.
- Each byte packs 2 pixels (low nibble = left pixel, high nibble = right pixel, per PICO-8's standard nibble order).
- `decode`'s return type gains a `gfx: SpriteSheet` field alongside step 04's `gff`; `encode`'s input grows the same field, packed back before delegating to step 01's pixel-injection logic.

## Testing Decisions

- Unit test: hand-crafted single byte decodes to the expected 2-pixel pair; inverse `encodeGfx` of those 2 pixels produces the same byte.
- Integration test: for a real fixture, `encodeGfx(decodeGfx(bytes))` is bit-exact against `bytes` over `0x0000-0x0FFF`.
- Step 01's Level 1 pixel round-trip test must still pass unmodified.

## Out of Scope

- `0x1000-0x1FFF` (shared gfx2/map2 region) — owned by step 06's `map` section.
- Text-file serialization — generic `JSON.stringify`, no per-section work needed.

## Further Notes

None.

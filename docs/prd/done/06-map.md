---
title: "map section: map grid (incl. shared area)"
description: "Decode 0x1000-0x2FFF (the shared gfx2/map2 area plus the map proper) into a self-contained MapGrid and re-encode it back to bytes."
status: done
---

## Problem Statement

Nothing decodes the map bytes into a usable structure. Per spec §8.1's explicit note, `map` must be self-contained over `0x1000-0x2FFF` (the duplicated/shared area plus the map proper) so the cart is openable even without reconstructing gfx context — this is the only section spanning two nominally-different memory regions.

## Solution

Define the real `MapGrid` type (superseding the step-02 placeholder) and implement `decodeMap(bytes: CartBytes): MapGrid` / `encodeMap(grid: MapGrid): Uint8Array` (8192 bytes) covering the full `0x1000-0x2FFF` range as tile-index bytes.

## User Stories

1. As a developer decoding a cart, I want the full `0x1000-0x2FFF` region turned into a self-contained `MapGrid`, so that the map is fully usable without needing the gfx section decoded too.
2. As a developer compacting a cart, I want `encodeMap` to pack a `MapGrid` back into exactly the 8192 bytes PICO-8 expects at `0x1000-0x2FFF`, bit-for-bit.
3. As a developer round-tripping decode then encode on a real fixture, I want the output bytes identical to the input, since this section is a fixed, lossless 1:1 layout (each byte = one sprite index 0-255).

## Implementation Decisions

- `MapGrid { width: number; height: number; cells: number[] }` — `cells` are raw sprite indices 0-255 (a full byte range, not one of the `IntegerRange_*` types, since 0-255 is effectively unconstrained for a `number`).
- Grid dimensions and row-major layout follow PICO-8's fixed map memory layout (128 columns × 64 rows across the combined `0x1000-0x2FFF` range, per the standard PICO-8 memory map).
- `decode`'s return type gains a `map: MapGrid` field alongside `gff`/`gfx`; `encode`'s input grows the same field.

## Testing Decisions

- Unit test: hand-crafted bytes decode to the expected cell values at expected `(x,y)` positions; inverse `encodeMap` produces the same bytes.
- Integration test: for a real fixture, `encodeMap(decodeMap(bytes))` is bit-exact against `bytes` over `0x1000-0x2FFF`.
- Step 01's Level 1 pixel round-trip test must still pass unmodified.

## Out of Scope

- `0x0000-0x0FFF` (top sprite sheet) — owned by step 05's `gfx` section; no coupling remains between the two steps since each owns a disjoint byte range.
- Text-file serialization — generic `JSON.stringify`.

## Further Notes

Confirms the gfx/map coupling flagged during design discussion resolves cleanly into two disjoint-byte-range steps with no runtime dependency between them.

---
title: "label section: cover image (read + re-injection)"
description: "Extract the upper 6 bits of the whole image into a PixelImage, and re-inject an edited PixelImage's upper 6 bits back into a pixel grid on encode."
status: needs-triage
---

## Problem Statement

The label/cover image is the whole 160x205 image's upper 6 bits per ARGB channel (spec §8.5) — nothing extracts it into a usable structure, and (per the earlier decision that label editing is in scope) nothing re-injects an edited label back into a pixel grid before final PNG encoding.

## Solution

Define the real `PixelImage` type (superseding the step-02 placeholder) and implement `decodeLabel(grid: PixelGrid): PixelImage` (reads upper 6 bits) and `encodeLabel(label: PixelImage, baseGrid: PixelGrid): PixelGrid` (writes the upper 6 bits, preserving `baseGrid`'s lower 2 bits — the cart-data bits already written by step 01's `encode` — unchanged).

## User Stories

1. As a developer extracting a cart, I want the label image available as a `PixelImage`, so that a user can preview/edit the cartridge's cover art as ordinary pixel data.
2. As a developer compacting a cart with an edited label, I want `encodeLabel` to write the new label pixels into a grid's upper 6 bits without disturbing the cart-data bits already written into the lower 2 bits.
3. As a developer round-tripping an unmodified fixture's label through decode then encode, I want the resulting grid's upper 6 bits identical to the original, so that a no-op edit truly is a no-op.
4. As a developer composing a full `encode()` call, I want label injection and cart-data injection (from step 01) to be independently callable and combinable on the same base grid, so that the final pixel grid reflects both a user's section edits and their label edit together.

## Implementation Decisions

- `PixelImage { width: 160; height: 205; pixels: {a: number; r: number; g: number; b: number}[] }` — raw ARGB channel values (0-63, the 6-bit range), not palette indices, since the label is an arbitrary composited image (F7 screenshot + template + text), not indexed sprite data — superseding the step-02 placeholder.
- `encodeLabel` takes a `baseGrid` argument (rather than producing a grid from scratch) specifically so it composes with step 01's cart-data injection output without either function needing to know about the other's bit range.
- `decode`'s return type gains a `label: PixelImage` field, and `encode`'s input grows the same field — this is the last section field `CartData` needs; from this step onward `decode`/`encode` operate on the full `CartData` shape (still pending Lua compression, steps 10-12).

## Testing Decisions

- Unit test: hand-crafted pixel with known upper-6-bit values decodes to the expected `PixelImage` pixel; inverse `encodeLabel` of that pixel reproduces the same upper 6 bits, leaving lower 2 bits (from `baseGrid`) untouched.
- Integration test: for a real fixture, `decodeLabel` then `encodeLabel` (no edits) reproduces the original grid's upper 6 bits exactly; combined with step 01's cart-data injection on the same base grid, the full pixel grid matches the original exactly (spec §7 Level 1 continues to hold for label carts too).
- Step 01's Level 1 pixel round-trip test must still pass unmodified.

## Out of Scope

- Any UI for actually editing the label image — library only.
- Interpreting the title/byline text bytes embedded in the Lua source's first two comment lines (spec §4) — that's a Lua-section concern (step 10), not this one.

## Further Notes

None.

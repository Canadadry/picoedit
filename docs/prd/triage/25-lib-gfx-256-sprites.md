---
title: "gfx: decode/encode the full 256-sprite sheet, not just sprites 0-127"
description: "Extend cart-gfx.ts to cover all 256 sprites (0x0000-0x1FFF) instead of silently leaving sprites 128-255 zeroed, and add an encode-time consistency check against the map's shared-region cells so a mismatch fails loudly instead of silently discarding data."
status: needs-triage
---

## Problem Statement

`SpriteSheet` is typed as a full 128×128 sheet (256 sprites), but `decodeGfx` only ever reads `0x0000-0x0FFF` (sprites 0-127) — the other half (`0x1000-0x1FFF`, sprites 128-255) is left at its `.fill(0)` default, because that byte range is also `MapGrid`'s shared top rows (`decodeMap` already reads it, as designed in `docs/spec.md` line 124: the map stays self-contained). Discovered while designing the React Sprite tab (PRD 19), which needs to *show* sprites 128-255 correctly and currently has to derive them from `cart.map.cells` itself as a workaround. Fixing decode at the library level removes the need for that workaround's read side.

## Solution

- `GFX_LENGTH` grows from `0x1000` to `0x2000`; `decodeGfx`/`encodeGfx` cover the full `0x0000-0x1FFF` range, so `SpriteSheet.pixels` is completely populated on decode and `cart.gfx.pixels` is the correct read path for all 256 sprites — no app-level derivation needed anymore.
- `decodeMap` is unchanged (still reads `0x1000-0x2FFF` self-containedly, per the existing spec decision) — so after decode, `cart.gfx.pixels[8192..16383]` and `cart.map.cells[0..4095]` represent the *same* underlying bytes, read two ways, and are trivially consistent right after `decode()`.
- The risk is at `encode()`: if a caller edits `cart.gfx` (sprites 128-255) and `cart.map` (the shared rows) independently and they drift apart, one write silently overwrites the other with no warning. `cart.ts`'s `encode()` adds a consistency check before writing: if the shared region derived from `cart.gfx.pixels[8192..16383]` doesn't exactly match `cart.map.cells[0..4095]`, throw a descriptive error naming the mismatch, rather than picking a winner silently. Write order (gfx then map) is otherwise unchanged.

## User Stories

1. As a developer reading `cart.gfx` after `decode()`, I want all 256 sprites' pixels populated correctly (not zeroed past sprite 127), so that I don't need to special-case the shared region myself.
2. As a developer building an editor that lets sprites and map be edited independently, I want `encode()` to fail loudly and specifically if I've let the shared region drift out of sync, so that I catch the bug instead of silently losing an edit.

## Implementation Decisions

- `SHEET_PIXEL_COUNT` (16384) already matches a full 128×128 sheet — no `SpriteSheet` type change needed, only `GFX_LENGTH`/the decode-loop bound in `cart-gfx.ts`.
- The consistency check lives in `cart.ts`'s `encode()` (it's the only place both `cart.gfx` and `cart.map` are available together), not in `cart-gfx.ts` or `cart-map.ts` individually.
- This PRD does not attempt real bidirectional sync (e.g. a shared backing array) — that's a bigger `CartData` shape change and explicitly deferred. The consistency check is the minimal fix that turns silent data loss into a clear error; call sites (the app's Sprite/Map tabs, PRD 19-21) are responsible for keeping both fields in sync when editing that region, e.g. by writing to both in one `updateCart` call.

## Testing Decisions

- Extend the existing fixture-based `cart-gfx.test.ts` round-trip to cover the full 256-sprite range (real fixtures already have real bytes there — no new fixture needed, just checking further into what's already decoded/re-encoded).
- New synthetic test in `cart.test.ts`: construct a `DecodedCart` where `cart.gfx`'s sprites 128-255 deliberately disagree with `cart.map.cells[0..4095]`, and assert `encode()` throws.

## Out of Scope

- Any `CartData` shape change (e.g. a shared backing array/proxy for the overlapping region) — the consistency check is the scoped fix for this PRD.
- Fixing up the app's Sprite/Map tab PRDs (19-21) to stop deriving from `cart.map.cells` on write — the read side no longer needs it, but the write side still routes through `cart.map` since that's what `encode()` actually serializes for that range; PRDs 19-21 get a small follow-up edit noting the read simplification, not a redesign.

## Further Notes

This is a deliberately narrow fix, not the "clean" architectural version (a single shared source of truth for the overlapping bytes) — chosen because the narrow version removes the silent-data-loss risk without a `CartData` shape change, and the fuller redesign can wait until it's actually needed.

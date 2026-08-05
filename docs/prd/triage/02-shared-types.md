---
title: "Shared CartData types and isValid"
description: "Define the CartData structured-section types (per spec §8.7) and a single isValid function that centralizes runtime validation of array lengths and numeric ranges."
status: needs-triage
---

## Problem Statement

Every later step (gff, gfx, map, sfx, music, label, lua) needs a shared, agreed-upon TypeScript vocabulary for the decoded cart. Without it defined once, each step would invent its own shapes and duplicate range/length checks ad hoc.

## Solution

Implement the exact types documented in spec §8.7 (`CartData`, `SpriteFlags`, `Effect`, `IntegerRange_0_8`/`IntegerRange_0_16`/`IntegerRange_0_64`, `Note`, `Sfx`, `PatternChannel`, `MusicPattern`, `LuaFormat`) plus a single `isValid(cart: CartData): boolean` function that checks the invariants types can't express (array lengths, numeric ranges after they've been computed from raw bytes but before being trusted as the narrow literal-union types). `CartBytes` (the branded `Uint8Array` `decode`/`encode` operate on) was already defined in step 01 — this step only adds the richer, structured vocabulary `decode`'s return type grows into from here on.

## User Stories

1. As a developer decoding cart bytes into a `CartData`, I want a single `isValid` function to call before returning, so that malformed data never silently leaves the parsing boundary.
2. As a developer building any per-section codec, I want the `CartData` shape already defined, so that I'm implementing against an agreed contract instead of inventing my own.
3. As a developer reading `isValid`'s implementation, I want it to check every invariant mentioned in the type comments (array lengths, numeric ranges), so that it's the single source of truth rather than one of several partial checks scattered across the codebase.
4. As a developer who accidentally builds a `CartData` with 63 sfx entries instead of 64, I want `isValid` to return `false`, so that the bug surfaces immediately rather than silently corrupting a later `encode()` call.

## Implementation Decisions

- Types exactly as specified in `docs/spec.md` §8.7: `CartData`, `SpriteFlags` (8 named booleans), `Effect` (string literal union), `IntegerRange_0_8`/`IntegerRange_0_16`/`IntegerRange_0_64` (named after their range, not their role), `Note`, `Sfx`, `PatternChannel`, `MusicPattern` (4-tuple), `LuaFormat` (discriminated union).
- `SpriteSheet`, `MapGrid`, `PixelImage` remain placeholder types until steps 05, 06, 09 pin them down — this step only needs them to exist as named types so `CartData`'s shape compiles; it does not implement their internals.
- No `readonly` anywhere — plain mutable objects/arrays throughout (decided during design: readonly would tax real editing usage without a matching benefit, since each pipeline stage naturally produces a fresh object rather than sharing references).
- `isValid(cart: CartData): boolean` checks: `gff.length === 256`; `sfx.length === 64` and each `sfx.notes.length === 32`; `music.length === 64`; for every `Note`, `pitch`/`instrument`/`volume` numerically within their range's bounds; for every `PatternChannel`, `sfxId` within bounds. Returns `boolean`, does not throw and does not collect per-field error messages — callers that want a thrown error wrap it themselves.

## Testing Decisions

- Integration-style: build one fully valid `CartData` fixture object by hand, assert `isValid` returns `true`.
- For each invariant, build one otherwise-valid `CartData` that violates just that invariant (wrong `gff` length, wrong `sfx` length, wrong `notes` length inside one `Sfx`, wrong `music` length, out-of-range `pitch`/`instrument`/`volume`/`sfxId`) and assert `isValid` returns `false`.

## Out of Scope

- `SpriteSheet`, `MapGrid`, `PixelImage` internal shapes — placeholders only, defined for real in steps 05, 06, 09.
- Parsing bytes into `CartData` — that's every later section step's job; this step only defines the target shape and validates it.

## Further Notes

This is the step every other step imports from — get it right before building on it.

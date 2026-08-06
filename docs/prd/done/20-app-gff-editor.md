---
title: "React app: GFF (sprite flags) tab"
description: "A standalone screen for viewing and toggling the 8 named flags on each of the 256 sprites, given a dedicated route rather than PICO-8's native placement inside the sprite editor's bottom panel."
status: done
---

## Problem Statement

`CartData.gff` (`SpriteFlags[]`, 256 entries of 8 named booleans — `src/internal/pico8/cart-gff.ts`, PRD 04, already `done`) can currently only be inspected or changed by hand-editing `gff.json`. Depends on PRD 18 (landed — app shell/`CartContext`), PRD 16 (landed — repo restructure), and PRD 25 (still triage — library fix: full 256-sprite `cart.gfx.pixels`, used here only for thumbnail rendering) landing first.

Natively, PICO-8 puts flag-toggling inside the sprite editor itself: selecting a sprite shows 8 colored circles (flags 0-7) below the canvas, click to toggle, "no particular meaning" beyond what a game's own code does with `fget()`/`fset()`. This app deliberately gives GFF its own route instead (an explicit product decision, not a research finding) — so this PRD designs it as a first-class screen rather than assuming it's a sidebar of the Sprite tab.

## Solution

Add `src/app/gff/GffTab.tsx` + `src/app/gff/components/`: a scrollable grid of all 256 sprite thumbnails (16×16 layout, matching native arrangement) reusing the sprite-pixel-derivation helper from PRD 19 (`src/app/state/sprite-pixels.ts`) so thumbnails render correctly for both the `cart.gfx`-backed sprites (0-127) and the `cart.map.cells`-backed ones (128-255). Each thumbnail shows a compact 8-dot summary of its own flags underneath; clicking a thumbnail opens a detail panel with 8 large, labeled toggles (styled as PICO-8's colored dots) for precise editing. Both the per-thumbnail dots and the detail-panel toggles write directly to `cart.gff[index]` via `updateCart`.

## User Stories

1. As a user, I want to see all 256 sprites' flags at a glance, so that I can spot inconsistencies (e.g. a sprite missing a "solid" flag) without opening each one.
2. As a user, I want to click a sprite's thumbnail and get a clear, labeled view of its 8 flags, so that toggling the right one is unambiguous (unlike 8 unlabeled dots in a cramped native panel).
3. As a user doing bulk edits, I want to toggle a flag directly from the grid (without opening the detail panel first), so that flagging many similar sprites (e.g. "all wall tiles are solid") is fast.

## Implementation Decisions

- **Flag colors are cosmetic only, not data**: `SpriteFlags` has no color field — PICO-8's colored dots are a fixed UI convention, not part of `CartData`. This tab reuses `src/internal/pico8/palette.ts`'s `PICO8_PALETTE` indices 8-15 (in flag 0-7 order) as that same fixed convention, purely for the toggle dots' color — a judgment call since the exact native default mapping wasn't confirmed from public docs, but it's non-load-bearing (no data implication either way).
- **Grid + detail panel**, not a single flat list: the grid alone (256 × 8 tiny dots) doesn't give enough click-target size for reliable toggling, so precise editing happens in the detail panel; the grid's own dots are a bulk/at-a-glance-editing shortcut layered on top.
- **Beyond-parity flag**: showing all 256 sprites' flag state simultaneously (vs. native PICO-8, which only shows the currently-selected sprite's 8 flags) is a deliberate, purely-additive readability improvement — it doesn't remove or change any native capability, just surfaces more at once. Flagged since it's not strictly "the same," but errs on the side of more information, not less.
- **Thumbnail rendering**: this tab only reads sprite pixels (for thumbnails), never writes them — so with PRD 25 landed, it's a plain `cart.gfx.pixels` lookup for all 256 sprites, no helper needed. (PRD 19's `src/app/state/shared-sprite-region.ts` write-mirroring helper is irrelevant here since GFF never edits pixels.)

## Testing Decisions

- Component tests (Vitest + React Testing Library, jsdom) render `GffTab` inside a real `CartProvider` loaded with an actual fixture from `cart/`, and drive flag toggling through both the grid's per-thumbnail dots and the detail panel via `userEvent`, asserting `cart.gff[index]`'s resulting state in `CartContext` directly — a `gff.json`-equivalent round-trip check (encode the result then decode it again in the test itself, and diff) can be folded into the same test rather than done manually.
- `spriteFlagsToByte`/`byteToSpriteFlags`-equivalent logic already has unit + integration tests in `src/internal/pico8/cart-gff.test.ts` (PRD 04) — this PRD adds no new binary-layout logic, only UI, so no new tests are needed for the data layer itself.

## Out of Scope

- Assigning custom colors to flags, or any semantic labeling of what a flag "means" (e.g. presets like "solid"/"climbable") — that's determined by a game's own Lua code via `fget()`, not something the editor can know.
- Any change to `src/internal/pico8/cart-gff.ts`'s existing decode/encode scope.

## Further Notes

Simplified versus its original draft once PRD 25 landed: thumbnail rendering no longer needs to know about the map-shared region at all, since `cart.gfx.pixels` is complete for all 256 sprites after decode.

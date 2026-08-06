---
title: "React app: Map tab"
description: "A tilemap editor for the 128x64 MapGrid, replicating PICO-8's own map editor tools (stamp, rectangular select/copy/paste, fill, eyedropper, pan/zoom) rendered with actual sprite pixels from the loaded cart's sprite sheet."
status: needs-triage
---

## Problem Statement

PICO-8's native map editor is a fixed-size, low-resolution grid where each cell shows a tiny sprite thumbnail — workable, but cramped, and the editor's own screen space competes with the sprite-picker strip and the game viewport it's rendered inside. There's currently no browser-based way to view or edit `CartData.map` at all outside hand-editing `map.json`.

## Solution

Depends on PRD 18 (landed — app shell, `CartContext`, routing), PRD 16 (landed — repo restructure — imports come from `src/internal/pico8/...`), and PRD 25 (still triage — library fix for the shared sprite/map region, see below) landing first. Adds the Map tab: `src/app/map/MapTab.tsx` + `src/app/map/components/`, reading/writing `cart.map` (a `MapGrid`, `{ width: 128, height: 64, cells: number[] }`, row-major, each cell a sprite index 0-255) via `CartContext`.

The tab replicates PICO-8's own map editor toolset (per the official manual):
- **Stamp**: click a cell to place the currently-selected stamp (a single sprite or a copied rectangular block); click-drag paints a continuous line of the single-sprite stamp across cells, matching PICO-8's own click-drag behavior.
- **Sprite picker**: a strip/grid of the loaded sprite sheet (`cart.gfx`) below the map canvas; click a sprite to make it the current single-sprite stamp; shift-drag a rectangular region of sprites to select a multi-sprite block stamp instead (PICO-8: "select from sprite navigator with shift+drag").
- **Select** (rectangular, on the map itself): click-drag to select a region of already-placed cells; this becomes the current stamp (PICO-8's copy = select, then switch to stamp to paste elsewhere); Enter or clicking elsewhere clears the selection.
- **Fill**: fills the current selection (or, with no selection, the whole visible viewport) with the current stamp's sprite — matches the manual's "fill with the current colour... applies only to the current selection, or the visible area if there is no selection."
- **Eyedropper**: right-click (or a dedicated toggle button, since right-click is reserved by the OS/browser context menu in some environments — see Further Notes) a cell to pick up its sprite as the current single-sprite stamp.
- **Pan/zoom**: click-drag with a pan tool (or space-held-down, mirroring PICO-8) to scroll; mousewheel (or +/- buttons, since `<`/`>` keys aren't discoverable in a GUI) to zoom.
- **Index overlay toggle**: a button (replacing PICO-8's Ctrl-H) that overlays each cell's sprite index (decimal, not hex — hex was a PICO-8-specific convenience for its own byte-oriented tools and isn't needed here) on top of the rendered sprite pixels.

**Shared sprite/map area**: cells at row 0-31 (`cells[0..4095]`, corresponding to cart bytes `0x1000-0x1FFF`) are the same memory as sprites 128-255 of the sprite sheet — editing them here also changes those sprites, and editing sprites 128-255 in the Sprite tab changes these rows. Rows 32-63 (`cells[4096..8191]`, `0x2000-0x2FFF`) are map-only. The canvas renders a persistent thin divider line between row 31 and row 32 with a label ("shared with sprite sheet" / "map-only"), so the coupling is always visible rather than a surprise.

Per PRD 25 (library fix, must land first alongside PRD 18/16): `encode()` now throws if `cart.gfx`'s sprites 128-255 don't match `cart.map.cells[0..4095]`. So any stamp/fill/paste that touches rows 0-31 must call `updateCart({ map: ..., gfx: ... })` together — writing the same change into both `cart.map.cells` and the mirrored slice of `cart.gfx.pixels` — using the same shared write-mirroring helper PRD 19 introduces (`src/app/state/shared-sprite-region.ts`), not a separate reimplementation.

## User Stories

1. As a user, I want to click a sprite in the picker and stamp it onto the map by clicking cells, so that I can lay out a level the same way I would in PICO-8.
2. As a user, I want to select a multi-tile block of sprites (e.g. a 3x3 tree) from the picker and stamp the whole block at once, so that I don't have to place each tile individually.
3. As a user, I want to select a region of the map I've already built, copy it, and stamp it elsewhere, so that I can reuse repeated structures.
4. As a user, I want the fill tool to flood the visible or selected area with one sprite, so that I can quickly block in backgrounds.
5. As a user, I want a clear visual cue that the top 32 rows of the map share memory with the last 128 sprites, so that I don't accidentally break my sprite sheet while editing the map (or vice versa) without realizing it.

## Implementation Decisions

- **Rendering**: the map canvas and sprite picker must render actual sprite pixels (via the palette), not bare index numbers, to be useful at a glance. PRD 17 (`docs/prd/done/17-sprite-map-png-render.md`, landed) already implements framework-free `PICO8_PALETTE` + `renderSpriteSheet()`/`renderMap()` logic in `src/internal/pico8/palette.ts` / `src/internal/pico8/render.ts` — relocated there from PRD 17's original CLI-only (`cmd/`) plan specifically so this tab and the Sprite tab (PRD 19) could reuse it instead of duplicating it. This tab imports those directly from `src/internal/pico8/`; no new palette/render modules or location amendment are needed here.
- The map canvas renders to an HTML `<canvas>` via `putImageData` from the RGBA `PixelGrid` that `renderMap()` produces (already alpha-opaque, per PRD 17) — no native `<canvas>` compositing of the source pixels themselves, avoiding the premultiplied-alpha pitfall `docs/spec.md` §6 already flags for the PNG codec path (that concern is about the *codec*, not UI canvas use, but the same rendered-pixel-buffer approach sidesteps it entirely here too).
- Current stamp (single sprite index, or a multi-sprite rectangular block with its own width/height in sprites) lives in local component state, not `CartContext` — it's tool state, not cart data.
- `updateCart({ map: nextGrid })` is called on every completed stamp/fill/paste action (not on every mouse-move during a drag) — one history-worthy change per user action, relevant if undo is added later (undo itself is out of scope here, see below).

## Testing Decisions

- Component tests (Vitest + React Testing Library, jsdom) render `MapTab` inside a real `CartProvider` loaded with an actual fixture from `cart/`, and drive stamp/select/fill/eyedrop interactions via `userEvent`, asserting the resulting `cart.map.cells` (and, for edits touching rows 0-31, the mirrored `cart.gfx.pixels`) in `CartContext` — including a round-trip assertion (encode the result then decode it again in the test itself, and diff the `MapGrid`). jsdom doesn't render actual `<canvas>` pixels, so confirming every cell's sprite renders correctly on screen (vs. just the underlying data being correct) remains a manual/visual check (`npm run dev`, load a real fixture, confirm the map renders with correct sprite pixels at every cell including the shared rows) worth doing before treating this as fully validated in practice.

## Out of Scope

- Undo/redo.
- Q/W "cycle to previous/next sprite" shortcut — minor convenience, not core capability parity.
- Any map size other than the fixed 128x64 (PICO-8 doesn't support resizing this either).
- Editing sprites directly from the Map tab's picker (picker is select-only; sprite editing itself belongs to the Sprite tab, PRD 19).

## Further Notes

Right-click-as-eyedropper may conflict with the browser's native context menu depending on how the canvas element handles `contextmenu` — flagged as an implementation detail to verify early (likely fix: `event.preventDefault()` on the canvas's `contextmenu` handler), not a design fork.

Sources consulted: official PICO-8 manual (lexaloffle.com/dl/docs/pico-8_manual.html) for map editor tool descriptions and shortcuts; PICO-8 Wiki's Map page for the 128x32/128x64 shared-area confirmation (cross-checked against this repo's own `docs/spec.md` §8.1 and `src/cart-map.ts`, which already implement the combined 128x64 self-contained grid).

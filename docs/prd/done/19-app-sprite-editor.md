---
title: "React app: Sprite (gfx) tab"
description: "A canvas-based pixel editor for all 256 sprites (SpriteSheet, sprites 0-127, plus the map-shared sprites 128-255), replicating PICO-8's native sprite-editor toolset: draw, color pick, select/copy/paste/stamp, fill, and shape tools."
status: done
---

## Problem Statement

`CartData.gfx` (`SpriteSheet`) can currently only be inspected or changed by hand-editing `gfx.json` — there's no visual way to see or draw a sprite. Depends on PRD 18 (landed — app shell, `CartContext`, routing), PRD 16 (landed — repo restructure, `src/internal/pico8/`), and **PRD 25** (still triage — library fix: `decodeGfx`/`encodeGfx` extended to cover all 256 sprites) landing first.

PICO-8's sprite sheet is actually 256 sprites (a 128×128 canvas split into 4 navigator tabs of 64×64 each); tabs 2 and 3 (sprites 128-255, the bottom half) occupy `0x1000-0x1FFF`, which is the *same* memory the map section's top rows use (`src/internal/pico8/cart-map.ts`'s `MapGrid.cells[0..4095]`, per spec §8.1's shared-region note). Per PRD 25, `cart.gfx.pixels` is now fully populated for all 256 sprites on decode — this PRD no longer needs to derive sprites 128-255 from map data to *display* them.

## Solution

Add `src/app/sprite/SpriteTab.tsx` + `src/app/sprite/components/`: a canvas rendering the full 256-sprite sheet, a palette swatch, a sprite navigator strip, and a toolbar matching PICO-8's actual sprite-editor tools (researched from the official manual — see Implementation Decisions). Edits write back into `CartContext` via `updateCart`.

**Reading** sprites 0-255 is now uniform: all of it comes from `cart.gfx.pixels` (per PRD 25). **Writing** is not symmetric, because `encode()` still serializes the shared byte range from `cart.map.cells`, not from `cart.gfx` (PRD 25 deliberately left this asymmetry rather than restructuring `CartData`, and added a consistency check that throws if the two disagree at encode time). So an edit to a sprite in 0-127 calls `updateCart({ gfx: ... })` as expected, but an edit to a sprite in 128-255 must call `updateCart({ gfx: ..., map: ... })` together, writing the same pixel change into both `cart.gfx.pixels[8192..16383]` and the corresponding cells of `cart.map.cells[0..4095]` in the same update, to satisfy PRD 25's consistency check and actually persist through `encode()`.

## User Stories

1. As a user, I want to see and draw all 256 sprites (not just 0-127), so that editing here matches what PICO-8's own sprite editor shows.
2. As a user, I want the same core tools PICO-8 gives me — freehand draw, color-pick by right-click, rectangle select with copy/cut/paste/stamp, fill, and basic shapes — so that this isn't a step down from the native editor.
3. As a user picking a color, I want a visible 16-color palette swatch to click, and a ctrl-click-to-replace shortcut on the canvas (matching PICO-8's "control-click to swap all of this color"), so that recoloring a sprite doesn't mean pixel-by-pixel repainting.
4. As a user editing sprite 200 (in the shared region), I want my edit to end up in the right place in the cart data so that it round-trips correctly through the map editor and the exported cart, without needing to know the memory-sharing detail myself.

## Implementation Decisions

- **Researched native toolset** (PICO-8 manual): Draw (LMB plots the active color, RMB samples/picks a color, CTRL+drag replaces one color across the selection/view), Select (rectangle drag; ENTER or click-away deselects; CTRL-C/X/V copy/cut/paste), Stamp (pastes the copy buffer; CTRL treats color 0 as transparent while stamping), Fill (fills the current selection or full visible area with the active color), Pan, and three Shape tools cycling oval/rect/line (CTRL = filled, SHIFT = snap to circle/square/simple ratios). All are implemented here for parity.
- **Explicitly not implemented, because they don't exist in native PICO-8 either**: sprite flip/rotate/stretch. Flipping is a runtime `spr()` draw parameter in PICO-8, not a sprite-sheet edit operation — including it here would exceed parity, not match it. (Could be a deliberate "beyond PICO-8" addition once the parity milestone is done — not this PRD's call to make.)
- **Rendering**: PRD 17 has landed and already created `src/internal/pico8/palette.ts` (exporting `PICO8_PALETTE`, the 16 standard PICO-8 colors as RGB, index 0 → opaque black) and `src/internal/pico8/render.ts` in the portable library — relocated there from PRD 17's original CLI-only plan specifically so both `src/cmd/cli.ts` and this tab's canvas renderer could import the same constant/logic instead of duplicating it. This tab imports those directly; no new palette/render modules or location amendment are needed here.
- **Sprite navigator**: a strip of all 256 8×8 thumbnails (16×16 grid, matching native layout) below the main canvas for picking which sprite(s) are in view; the main canvas supports multi-sprite selections (drawing across sprite boundaries as one continuous region), matching native behavior.
- **Zoom**: the main canvas defaults to showing more than one native "tab" of sprites at a large integer zoom (screen space is not a constraint we need to imitate) — this is screen-real-estate, not a capability difference, so it doesn't contradict "parity first."
- **Data flow helper**: reading is now a plain `cart.gfx.pixels` lookup (no helper needed). Writing to a sprite in 128-255 needs a small shared helper (get/set that also mirrors the write into `cart.map.cells`) so the mirroring logic isn't duplicated between this tab and the GFF tab (PRD 20) or the Map tab (PRD 21, which can also edit this range). Lives in a non-tab-owned location, e.g. `src/app/state/shared-sprite-region.ts`.

## Testing Decisions

- Component tests (Vitest + React Testing Library, jsdom) render `SpriteTab` inside a real `CartProvider` loaded with an actual fixture from `cart/`, and drive draw/select/fill/copy-paste interactions across both the 0-127 and 128-255 ranges via `userEvent`, asserting the resulting `CartContext` state (`cart.gfx.pixels` and, for 128-255 edits, the mirrored `cart.map.cells`) rather than pixel-perfect canvas output — jsdom doesn't render actual `<canvas>` pixels, so a final visual/manual check (`npm run dev`, load a real fixture, draw across both ranges, download, confirm the result is a loadable, visually-correct `.p8.png`) remains worthwhile before considering a change fully validated in practice.
- The framework-free logic — nibble pack/unpack for the shared region, color-replace, the sprite-pixel get/set helper — gets hand-written unit tests co-located under `src/app/sprite/` or `src/app/state/`, per `docs/spec.md` §7's guidance to unit-test genuinely non-trivial algorithmic logic even where full UI isn't tested.

## Out of Scope

- Flip/rotate/stretch (not native; see above).
- Animation preview/onion-skinning, the manual's "hex view" toggle — niche native features, not required for parity's core toolset.
- Any change to `src/internal/pico8/cart-gfx.ts`'s or `cart-map.ts`'s existing decode/encode scope — the 128-255 handling is entirely an app-layer concern in this PRD.

## Further Notes

PRD 25 moved the read-side fix into the library, which simplifies this PRD versus its original draft (no more deriving pixels from map data to display them). The write-side asymmetry (edits to 128-255 must touch both `cart.gfx` and `cart.map`) is a direct, intentional consequence of PRD 25's scoped fix, not a leftover workaround — revisit only if PRD 25's consistency-check approach is later replaced with a real shared-backing-array design.

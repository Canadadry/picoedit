---
title: "cli decode: sprite sheet and tilemap PNG rendering"
description: "Have `cli decode` also render sprite.png (the raw sprite sheet) and map.png (the composited tilemap) as visual PNGs alongside the existing JSON/lua output."
status: done
---

## Problem Statement

`cli decode` extracts a cart's sprite sheet and map into `gfx.json`/`map.json` — raw palette-index/cell-index arrays that are only readable by writing a script or opening a debugger. There's no quick way to actually look at what a cart's sprites or tilemap look like without re-encoding to a `.p8.png` and opening it in PICO-8 or another tool.

## Solution

Extend `decodeCommand` (in `src/cmd/cli.ts`) to render two additional PNGs into the output folder after the existing files: `sprite.png` (the raw 128×128 sprite sheet) and `map.png` (the 128×64 map, composited using the actual sprite pixels each cell points to). Both are upscaled by an integer factor (default 4×, overridable via a new `-s <value>` CLI flag) and use the standard PICO-8 16-color palette. This is CLI-only rendering, not a change to the core library's `decode()`.

Depends on PRD 16 (repo restructure) landing first for the `src/internal/pico8/` folder these two modules live in.

**Amended**: originally specified to live in `src/cmd/` (CLI-only), `palette.ts`/`render.ts` are relocated to `src/internal/pico8/` (the portable library) per PRDs 19 (sprite editor) and 21 (map editor), which need the same rendering logic from the browser app and would otherwise have to duplicate it. Whichever of PRD 17/19/21 lands first creates the two modules at their `src/internal/pico8/` location; `src/cmd/cli.ts` then imports them the same way `app/sprite/`/`app/map/` do.

## User Stories

1. As a developer running `cli decode cart.p8.png out/`, I want `out/sprite.png` to show me the cart's full sprite sheet as a real image, so that I can sanity-check the extracted graphics without writing a script.
2. As a developer running `cli decode cart.p8.png out/`, I want `out/map.png` to show me the actual composited tilemap (real sprite pixels drawn at each cell), so that I can see what the game's map looks like at a glance.
3. As a developer who finds the default image size too small (or too large) to inspect comfortably, I want `cli decode cart.p8.png out/ -s 8` to scale both PNGs by a different integer factor, so that I can adjust for my screen/use case.
4. As a developer inspecting `sprite.png`, I want palette index 0 (black) rendered as opaque black (not transparent), matching how PICO-8's own sprite editor displays it.
5. As a future consumer of a React display component, I want the rendering logic (palette lookup, sprite compositing) implemented as plain, framework-free functions operating on existing domain types (`SpriteSheet`, `MapGrid`), so that the same logic could in principle be reused outside the CLI, even though canvas is expected to be the actual renderer there.

## Implementation Decisions

- New module `src/internal/pico8/palette.ts`: exports `PICO8_PALETTE`, the 16 standard/default PICO-8 colors as RGB triples, indexed 0-15 to match `IntegerRange_0_16`.
- New module `src/internal/pico8/render.ts`, the deep module doing the actual rendering work:
  - `renderSpriteSheet(sheet: SpriteSheet, scale: number): PixelGrid` — maps each of the sheet's 128×128 palette-index pixels to RGBA via `PICO8_PALETTE` (alpha always opaque; index 0 → opaque black, not transparent), then nearest-neighbor upscales by `scale`. No grid lines between sprites.
  - `renderMap(map: MapGrid, sheet: SpriteSheet, scale: number): PixelGrid` — for each of the map's 128×64 cells, looks up the cell's value (0-255) as a sprite index into `sheet`'s 16×16 grid of 8×8 sprites, copies that sprite's actual pixels (via the same palette lookup as `renderSpriteSheet`) into the corresponding 8×8 output block, then nearest-neighbor upscales the whole composited image by `scale`.
  - Both return the `PixelGrid` shape already defined in `src/internal/pico8/cart-bytes.ts` (`{width, height, channels, depth, data}`), so `src/cmd/cli.ts` writes the actual PNG bytes by passing the result straight into the existing `encodePixelGrid()` — no new PNG-encoding code needed.
- `scale` is a single positive integer shared by both `sprite.png` and `map.png` (not independently configurable per image).
- Output dimensions at the default scale of 4: `sprite.png` is 512×512, `map.png` is 4096×2048 (128×64 cells × 8px/cell × 4).
- `src/cmd/cli.ts` changes:
  - `decodeCommand(inputPath, outputFolder, scale = 4)` — after writing the existing 8 files, calls `renderSpriteSheet(cart.gfx, scale)` / `renderMap(cart.map, cart.gfx, scale)`, encodes each via `encodePixelGrid`, and writes `sprite.png`/`map.png`.
  - `main()` hand-parses an optional `-s <value>` token out of `argv` for the `decode` subcommand only (space-separated, e.g. `decode cart.p8.png out/ -s 8`), consistent with the project's existing no-flag-library, positional-args style (PRD 14). Defaults to 4 when omitted. `encode` is unaffected — no scale concept applies there.
  - This is purely additive to `decodeCommand`/`main`; `encodeCommand` and the core `decode()`/`encode()` library functions in `src/internal/pico8/cart.ts` are untouched. The two new PNGs are one-way, render-only artifacts — they are never read back in by `encodeCommand`.

## Testing Decisions

- `src/internal/pico8/render.ts` (the deep module) gets hand-crafted unit tests, following the style of `cart-gfx.test.ts`/`cart-label.test.ts` (construct a small/known `SpriteSheet`/`MapGrid`, assert exact output pixels):
  - `renderSpriteSheet` at scale 1: a sheet with one known non-zero pixel produces a `PixelGrid` whose corresponding RGBA value matches `PICO8_PALETTE`'s entry for that index, and whose index-0 pixels are opaque black.
  - `renderSpriteSheet` at scale 2: a single-pixel input produces the correct 2×2 block of identical RGBA output pixels (verifies nearest-neighbor upscaling).
  - `renderMap` at scale 1: a small map referencing a known sprite index produces an output block matching that sprite's actual pixels from the sheet (verifies compositing, not just palette lookup).
  - `renderMap` at scale 2: verifies the composited image is then correctly upscaled as a whole.
- `src/internal/pico8/palette.ts` gets a small sanity test: `PICO8_PALETTE` has exactly 16 entries, and one or two well-known entries (e.g. index 0 = black, index 8 = red) match PICO-8's documented default hex values.
- `src/cmd/cli.test.ts` (existing fixture-based decode/encode test) is extended: after `decodeCommand`, assert `sprite.png` and `map.png` exist and, when decoded via `decodePixelGrid`, have the expected dimensions for the scale used (512×512 / 4096×2048 at the default). A second case runs `decodeCommand` with an explicit non-default scale (e.g. 2) and asserts the resulting dimensions scale accordingly. `encodeCommand`'s existing round-trip assertions are unaffected since the two new PNGs are never read back in.

## Out of Scope

- Any change to `encodeCommand` or the core library's `decode()`/`encode()` — rendering is CLI-only and one-way.
- Grid lines or any other debug overlay on `sprite.png` (explicitly rejected).
- Transparency for palette index 0 (explicitly rejected — renders as opaque black).
- Independent scale factors per image, or non-integer/non-uniform scaling.
- Any actual React/canvas display component — this PRD only keeps the rendering logic framework-free enough that it *could* be reused later; building that component is future work.
- Supporting extended/custom palettes (e.g. PICO-8 0.2.x's secret palette or runtime `pal()` remaps) — only the single standard default 16-color palette is used.

## Further Notes

Depends on PRD 16 landing first, since `palette.ts`/`render.ts` are specified to live in `src/internal/pico8/`, which that restructure creates. PRD 16 has landed (2026-08-06).

See the amendment note near the top of this PRD: these two modules' location changed from the original `src/cmd/`-only plan to `src/internal/pico8/` once PRDs 19/21 (React sprite/map editors) needed to share the same rendering logic.

import type { DecodedCart } from "../../internal/pico8/cart.ts";
import type { IntegerRange_0_16 } from "../../internal/pico8/cart-data.ts";
import {
  isSharedMapCell,
  setSpritePixels,
  sharedRegionPixelForMapCell,
  type SpritePixelEdit,
} from "../state/shared-sprite-region.ts";

/**
 * Framework-free rasterization/selection algorithms behind the map editor's
 * stamp, select, and fill tools. Kept pure (no canvas, no cart access
 * besides the read/write helpers explicitly passed in) so they're
 * unit-testable on their own, mirroring src/app/sprite/tools.ts's approach —
 * the data model here is sprite indices per map cell, not per-pixel colors.
 */

export const MAP_WIDTH = 128;
export const MAP_HEIGHT = 64;

export interface Point {
  x: number;
  y: number;
}

/** An unordered rectangle, as produced by a drag from (x0,y0) to (x1,y1). */
export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface NormalizedRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function normalizeRect(rect: Rect): NormalizedRect {
  return {
    left: Math.min(rect.x0, rect.x1),
    right: Math.max(rect.x0, rect.x1),
    top: Math.min(rect.y0, rect.y1),
    bottom: Math.max(rect.y0, rect.y1),
  };
}

export function cellIndex(x: number, y: number): number {
  return y * MAP_WIDTH + x;
}

/** Bresenham's line algorithm, integer coordinates only (dup of sprite/tools.ts's, kept tab-local). */
export function rasterizeLine(x0: number, y0: number, x1: number, y1: number): Point[] {
  const points: Point[] = [];
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    points.push({ x, y });
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
  return points;
}

/** The current stamp: a rectangular block of sprite indices, row-major, 1x1 for a single sprite. */
export interface Stamp {
  width: number;
  height: number;
  sprites: number[];
}

export function singleStamp(spriteIndex: number): Stamp {
  return { width: 1, height: 1, sprites: [spriteIndex] };
}

/** Captures the selection's sprite indices in row-major order, normalized regardless of drag direction. */
export function copyMapRegion(getCell: (x: number, y: number) => number, rect: Rect): Stamp {
  const { left, right, top, bottom } = normalizeRect(rect);
  const width = right - left + 1;
  const height = bottom - top + 1;
  const sprites: number[] = [];
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      sprites.push(getCell(x, y));
    }
  }
  return { width, height, sprites };
}

export interface MapCellEdit {
  x: number;
  y: number;
  spriteIndex: number;
}

/**
 * The stamp tool: places `stamp` with its top-left at (originX, originY).
 * Edits landing outside the 128x64 map are dropped rather than throwing, so
 * stamping near an edge just clips.
 */
export function pasteStamp(stamp: Stamp, originX: number, originY: number): MapCellEdit[] {
  const edits: MapCellEdit[] = [];
  for (let y = 0; y < stamp.height; y++) {
    for (let x = 0; x < stamp.width; x++) {
      const spriteIndex = stamp.sprites[y * stamp.width + x]!;
      const targetX = originX + x;
      const targetY = originY + y;
      if (targetX < 0 || targetX >= MAP_WIDTH || targetY < 0 || targetY >= MAP_HEIGHT) continue;
      edits.push({ x: targetX, y: targetY, spriteIndex });
    }
  }
  return edits;
}

/** Fills `bounds`, or the whole `width`x`height` view when there's none, with `spriteIndex`. */
export function fillMapArea(
  width: number,
  height: number,
  bounds: Rect | null,
  spriteIndex: number,
): MapCellEdit[] {
  const { left, right, top, bottom } = bounds
    ? normalizeRect(bounds)
    : { left: 0, right: width - 1, top: 0, bottom: height - 1 };
  const edits: MapCellEdit[] = [];
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      edits.push({ x, y, spriteIndex });
    }
  }
  return edits;
}

/**
 * Applies a batch of map-cell edits and returns a patch suitable for
 * `updateCart`. `cart.map.cells` is always patched directly (the
 * authoritative source for the new sprite-index values); edits landing in
 * the shared region (row < 32) are additionally routed through
 * `setSpritePixels` (src/app/state/shared-sprite-region.ts) so the mirrored
 * `cart.gfx.pixels` nibbles come from that single shared helper rather than
 * a second, independent reimplementation of the nibble-packing rule.
 */
export function applyMapEdits(cart: DecodedCart, edits: readonly MapCellEdit[]): Partial<DecodedCart> {
  if (edits.length === 0) return {};

  const cells = cart.map.cells.slice();
  const pixelEdits: SpritePixelEdit[] = [];
  for (const edit of edits) {
    const idx = cellIndex(edit.x, edit.y);
    const spriteIndex = edit.spriteIndex & 0xff;
    cells[idx] = spriteIndex;
    if (isSharedMapCell(idx)) {
      const { x: px, y: py } = sharedRegionPixelForMapCell(idx);
      const low = (spriteIndex & 0xf) as IntegerRange_0_16;
      const high = ((spriteIndex >> 4) & 0xf) as IntegerRange_0_16;
      pixelEdits.push({ x: px, y: py, color: low });
      pixelEdits.push({ x: px + 1, y: py, color: high });
    }
  }

  const map = { ...cart.map, cells };
  if (pixelEdits.length === 0) return { map };

  const gfx = setSpritePixels(cart, pixelEdits).gfx;
  return { map, gfx };
}

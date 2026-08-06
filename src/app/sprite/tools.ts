import type { IntegerRange_0_16 } from "../../internal/pico8/cart-data.ts";
import { SHEET_HEIGHT, SHEET_WIDTH, type SpritePixelEdit } from "../state/shared-sprite-region.ts";

/**
 * Framework-free rasterization/selection algorithms behind the sprite
 * editor's shape, replace-color, and fill tools. Kept pure (no canvas, no
 * cart access) so they're unit-testable on their own, per docs/spec.md §7's
 * guidance to hand-test genuinely non-trivial algorithmic logic.
 */

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

/** Bresenham's line algorithm, integer coordinates only. */
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

export function rasterizeRect(rect: Rect, filled: boolean): Point[] {
  const { left, right, top, bottom } = normalizeRect(rect);
  const points: Point[] = [];
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      if (filled || x === left || x === right || y === top || y === bottom) {
        points.push({ x, y });
      }
    }
  }
  return points;
}

/** Midpoint-style ellipse bounded by rect's box, filled or outline-only. */
export function rasterizeOval(rect: Rect, filled: boolean): Point[] {
  const { left, right, top, bottom } = normalizeRect(rect);
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;
  const rx = (right - left) / 2 || 0.5;
  const ry = (bottom - top) / 2 || 0.5;

  const inside = (x: number, y: number): boolean => {
    const nx = (x - cx) / rx;
    const ny = (y - cy) / ry;
    return nx * nx + ny * ny <= 1;
  };

  const points: Point[] = [];
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      if (!inside(x, y)) continue;
      if (filled) {
        points.push({ x, y });
        continue;
      }
      const isEdge =
        !inside(x + 1, y) || !inside(x - 1, y) || !inside(x, y + 1) || !inside(x, y - 1);
      if (isEdge) points.push({ x, y });
    }
  }
  return points;
}

/** Adjusts the drag's far corner so width === height, keeping drag direction (shift-snap). */
export function snapSquare(x0: number, y0: number, x1: number, y1: number): { x1: number; y1: number } {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const size = Math.max(Math.abs(dx), Math.abs(dy));
  const sx = dx < 0 ? -1 : 1;
  const sy = dy < 0 ? -1 : 1;
  return { x1: x0 + sx * size, y1: y0 + sy * size };
}

/**
 * PICO-8's "control-click to replace all of this color" — every pixel
 * matching `targetColor` within `bounds` (the active selection, or the
 * whole `width`x`height` view when there's no selection) becomes `newColor`.
 */
export function replaceColor(
  width: number,
  height: number,
  getColor: (x: number, y: number) => IntegerRange_0_16,
  bounds: Rect | null,
  targetColor: IntegerRange_0_16,
  newColor: IntegerRange_0_16,
): SpritePixelEdit[] {
  const { left, right, top, bottom } = bounds
    ? normalizeRect(bounds)
    : { left: 0, right: width - 1, top: 0, bottom: height - 1 };
  const edits: SpritePixelEdit[] = [];
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      if (getColor(x, y) === targetColor) {
        edits.push({ x, y, color: newColor });
      }
    }
  }
  return edits;
}

/** Fills the active selection, or the whole view when there's none, with `color`. */
export function fillArea(width: number, height: number, bounds: Rect | null, color: IntegerRange_0_16): SpritePixelEdit[] {
  const { left, right, top, bottom } = bounds
    ? normalizeRect(bounds)
    : { left: 0, right: width - 1, top: 0, bottom: height - 1 };
  const edits: SpritePixelEdit[] = [];
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      edits.push({ x, y, color });
    }
  }
  return edits;
}

/** The select tool's copy/cut buffer: a rectangular block of palette indices. */
export interface Clipboard {
  width: number;
  height: number;
  pixels: IntegerRange_0_16[];
}

/** Captures the selection's pixels in row-major order, normalized regardless of drag direction. */
export function copyRegion(getColor: (x: number, y: number) => IntegerRange_0_16, rect: Rect): Clipboard {
  const { left, right, top, bottom } = normalizeRect(rect);
  const width = right - left + 1;
  const height = bottom - top + 1;
  const pixels: IntegerRange_0_16[] = [];
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      pixels.push(getColor(x, y));
    }
  }
  return { width, height, pixels };
}

/**
 * The stamp tool: places `clipboard` with its top-left at (originX, originY).
 * `transparentZero` mirrors native PICO-8's CTRL-while-stamping behavior,
 * skipping color-0 pixels instead of overwriting with them. Edits landing
 * outside the 128x128 sheet are dropped rather than throwing, so stamping
 * near an edge just clips.
 */
export function pasteClipboard(
  clipboard: Clipboard,
  originX: number,
  originY: number,
  transparentZero: boolean,
): SpritePixelEdit[] {
  const edits: SpritePixelEdit[] = [];
  for (let y = 0; y < clipboard.height; y++) {
    for (let x = 0; x < clipboard.width; x++) {
      const color = clipboard.pixels[y * clipboard.width + x]!;
      if (transparentZero && color === 0) continue;
      const targetX = originX + x;
      const targetY = originY + y;
      if (targetX < 0 || targetX >= SHEET_WIDTH || targetY < 0 || targetY >= SHEET_HEIGHT) continue;
      edits.push({ x: targetX, y: targetY, color });
    }
  }
  return edits;
}

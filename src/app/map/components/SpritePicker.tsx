import { useEffect, useRef, type PointerEvent } from "react";
import type { SpriteSheet } from "../../../internal/pico8/cart-data.ts";
import { renderSpriteSheet } from "../../../internal/pico8/render.ts";
import { normalizeRect, type Point, type Rect } from "../tools.ts";

const SPRITE_SIZE = 8;
const SHEET_COLUMNS = 16;
const SHEET_ROWS = 16;
export const THUMB_ZOOM = 2;

interface SpritePickerProps {
  sheet: SpriteSheet;
  /** Currently selected sprite-grid rect (x/y in 0-15 sprite-index units, not pixels). */
  selection: Rect | null;
  onSelectionChange: (rect: Rect) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getSpriteCellCoords(
  event: { clientX: number; clientY: number },
  canvas: HTMLCanvasElement,
): Point {
  const rect = canvas.getBoundingClientRect();
  const cellPx = SPRITE_SIZE * THUMB_ZOOM;
  const x = Math.floor((event.clientX - rect.left) / cellPx);
  const y = Math.floor((event.clientY - rect.top) / cellPx);
  return { x: clamp(x, 0, SHEET_COLUMNS - 1), y: clamp(y, 0, SHEET_ROWS - 1) };
}

/**
 * A strip/grid of the loaded sprite sheet (`cart.gfx`), select-only: click a
 * sprite to make it the current single-sprite stamp, shift-drag a
 * rectangular region to select a multi-sprite block stamp instead
 * (PICO-8: "select from sprite navigator with shift+drag"). Editing sprites
 * belongs to the Sprite tab, not here.
 */
export function SpritePicker({ sheet, selection, onSelectionChange }: SpritePickerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{ start: Point; shift: boolean } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    const grid = renderSpriteSheet(sheet, THUMB_ZOOM);
    const imageData = new ImageData(new Uint8ClampedArray(grid.data), grid.width, grid.height);
    ctx.putImageData(imageData, 0, 0);

    if (selection) {
      const { left, top, right, bottom } = normalizeRect(selection);
      const cellPx = SPRITE_SIZE * THUMB_ZOOM;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        left * cellPx + 0.5,
        top * cellPx + 0.5,
        (right - left + 1) * cellPx - 1,
        (bottom - top + 1) * cellPx - 1,
      );
    }
  }, [sheet, selection]);

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture?.(event.pointerId);
    const { x, y } = getSpriteCellCoords(event, canvas);
    dragRef.current = { start: { x, y }, shift: event.shiftKey };
    onSelectionChange({ x0: x, y0: y, x1: x, y1: y });
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    const canvas = canvasRef.current;
    if (!drag || !canvas) return;
    const { x, y } = getSpriteCellCoords(event, canvas);
    if (drag.shift) {
      onSelectionChange({ x0: drag.start.x, y0: drag.start.y, x1: x, y1: y });
    } else {
      onSelectionChange({ x0: x, y0: y, x1: x, y1: y });
      dragRef.current = { start: { x, y }, shift: false };
    }
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  return (
    <canvas
      ref={canvasRef}
      data-testid="map-sprite-picker"
      aria-label="Sprite picker"
      width={sheet.width * THUMB_ZOOM}
      height={sheet.height * THUMB_ZOOM}
      style={{ cursor: "pointer", display: "block", imageRendering: "pixelated" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    />
  );
}

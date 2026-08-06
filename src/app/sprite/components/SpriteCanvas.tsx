import { useEffect, useRef, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import type { DecodedCart } from "../../../internal/pico8/cart.ts";
import { renderSpriteSheet } from "../../../internal/pico8/render.ts";
import {
  getSpritePixel,
  SHEET_HEIGHT,
  SHEET_WIDTH,
  type SpritePixelEdit,
} from "../../state/shared-sprite-region.ts";
import {
  fillArea,
  normalizeRect,
  pasteClipboard,
  rasterizeLine,
  rasterizeOval,
  rasterizeRect,
  replaceColor,
  snapSquare,
  type Clipboard,
  type Point,
  type Rect,
} from "../tools.ts";
import type { Tool } from "../SpriteTab.tsx";
import type { IntegerRange_0_16 } from "../../../internal/pico8/cart-data.ts";

interface SpriteCanvasProps {
  cart: DecodedCart;
  tool: Tool;
  activeColor: IntegerRange_0_16;
  zoom: number;
  selection: Rect | null;
  onSelectionChange: (rect: Rect | null) => void;
  clipboard: Clipboard | null;
  onApplyEdits: (edits: SpritePixelEdit[]) => void;
  onPickColor: (color: IntegerRange_0_16) => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
}

type DragState =
  | { tool: "draw"; last: Point }
  | { tool: "select" | "rect" | "oval" | "line"; start: Point }
  | { tool: "pan"; startClientX: number; startClientY: number; startScrollLeft: number; startScrollTop: number }
  | null;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getPixelCoords(
  event: { clientX: number; clientY: number },
  canvas: HTMLCanvasElement,
  zoom: number,
): Point {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((event.clientX - rect.left) / zoom);
  const y = Math.floor((event.clientY - rect.top) / zoom);
  return { x: clamp(x, 0, SHEET_WIDTH - 1), y: clamp(y, 0, SHEET_HEIGHT - 1) };
}

/**
 * The main pixel-editing surface: renders the full 256-sprite sheet via
 * `renderSpriteSheet` (from `src/internal/pico8/render.ts`) and dispatches
 * pointer gestures to the active tool. Edits are reported up as
 * `SpritePixelEdit[]` batches — this component never touches CartContext
 * directly, so the 128-255 gfx/map mirroring stays entirely in
 * `shared-sprite-region.ts`.
 */
export function SpriteCanvas({
  cart,
  tool,
  activeColor,
  zoom,
  selection,
  onSelectionChange,
  clipboard,
  onApplyEdits,
  onPickColor,
  onCopy,
  onCut,
  onPaste,
}: SpriteCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    const grid = renderSpriteSheet(cart.gfx, zoom);
    const imageData = new ImageData(new Uint8ClampedArray(grid.data), grid.width, grid.height);
    ctx.putImageData(imageData, 0, 0);
    if (selection) {
      const { left, top, right, bottom } = normalizeRect(selection);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        left * zoom + 0.5,
        top * zoom + 0.5,
        (right - left + 1) * zoom - 1,
        (bottom - top + 1) * zoom - 1,
      );
    }
  }, [cart.gfx, zoom, selection]);

  function readColor(x: number, y: number): IntegerRange_0_16 {
    return getSpritePixel(cart, x, y);
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture?.(event.pointerId);
    const { x, y } = getPixelCoords(event, canvas, zoom);

    if (tool === "draw" && event.button === 2) {
      onPickColor(readColor(x, y));
      return;
    }
    if (tool === "draw" && (event.ctrlKey || event.metaKey)) {
      const edits = replaceColor(SHEET_WIDTH, SHEET_HEIGHT, readColor, selection, readColor(x, y), activeColor);
      onApplyEdits(edits);
      return;
    }
    if (tool === "draw") {
      dragRef.current = { tool: "draw", last: { x, y } };
      onApplyEdits([{ x, y, color: activeColor }]);
      return;
    }
    if (tool === "select" || tool === "rect" || tool === "oval" || tool === "line") {
      dragRef.current = { tool, start: { x, y } };
      if (tool === "select") onSelectionChange({ x0: x, y0: y, x1: x, y1: y });
      return;
    }
    if (tool === "fill") {
      onApplyEdits(fillArea(SHEET_WIDTH, SHEET_HEIGHT, selection, activeColor));
      return;
    }
    if (tool === "stamp") {
      if (!clipboard) return;
      onApplyEdits(pasteClipboard(clipboard, x, y, event.ctrlKey || event.metaKey));
      return;
    }
    if (tool === "pan") {
      const container = containerRef.current;
      dragRef.current = {
        tool: "pan",
        startClientX: event.clientX,
        startClientY: event.clientY,
        startScrollLeft: container?.scrollLeft ?? 0,
        startScrollTop: container?.scrollTop ?? 0,
      };
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag) return;

    if (drag.tool === "pan") {
      const container = containerRef.current;
      if (!container) return;
      container.scrollLeft = drag.startScrollLeft - (event.clientX - drag.startClientX);
      container.scrollTop = drag.startScrollTop - (event.clientY - drag.startClientY);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getPixelCoords(event, canvas, zoom);

    if (drag.tool === "draw") {
      const points = rasterizeLine(drag.last.x, drag.last.y, x, y);
      onApplyEdits(points.map((p) => ({ x: p.x, y: p.y, color: activeColor })));
      dragRef.current = { tool: "draw", last: { x, y } };
      return;
    }
    if (drag.tool === "select") {
      onSelectionChange({ x0: drag.start.x, y0: drag.start.y, x1: x, y1: y });
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    if (drag.tool === "rect" || drag.tool === "oval" || drag.tool === "line") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const { x, y } = getPixelCoords(event, canvas, zoom);
      let endX = x;
      let endY = y;
      if (event.shiftKey && drag.tool !== "line") {
        const snapped = snapSquare(drag.start.x, drag.start.y, x, y);
        endX = snapped.x1;
        endY = snapped.y1;
      }
      const rect: Rect = { x0: drag.start.x, y0: drag.start.y, x1: endX, y1: endY };
      const filled = event.ctrlKey || event.metaKey;
      const points =
        drag.tool === "line"
          ? rasterizeLine(drag.start.x, drag.start.y, endX, endY)
          : drag.tool === "rect"
            ? rasterizeRect(rect, filled)
            : rasterizeOval(rect, filled);
      onApplyEdits(points.map((p) => ({ x: p.x, y: p.y, color: activeColor })));
    }
  }

  function handleContextMenu(event: MouseEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas || tool !== "draw") return;
    const { x, y } = getPixelCoords(event, canvas, zoom);
    onPickColor(readColor(x, y));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter") {
      onSelectionChange(null);
      return;
    }
    const mod = event.ctrlKey || event.metaKey;
    if (!mod) return;
    const key = event.key.toLowerCase();
    if (key === "c") onCopy();
    else if (key === "x") onCut();
    else if (key === "v") onPaste();
  }

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Sprite sheet canvas"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="inline-block max-h-[70vh] max-w-full overflow-auto border border-neutral-700"
    >
      <canvas
        ref={canvasRef}
        data-testid="sprite-canvas"
        width={SHEET_WIDTH * zoom}
        height={SHEET_HEIGHT * zoom}
        style={{ cursor: tool === "pan" ? "grab" : "crosshair", display: "block" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={handleContextMenu}
      />
    </div>
  );
}

import { useEffect, useRef, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import type { DecodedCart } from "../../../internal/pico8/cart.ts";
import { renderMap } from "../../../internal/pico8/render.ts";
import type { MapTool } from "../MapTab.tsx";
import {
  cellIndex,
  fillMapArea,
  MAP_HEIGHT,
  MAP_WIDTH,
  normalizeRect,
  pasteStamp,
  rasterizeLine,
  singleStamp,
  type MapCellEdit,
  type Point,
  type Rect,
  type Stamp,
} from "../tools.ts";

const CELL_SIZE = 8;
/** Rows 0-31 of the map (cells 0-4095) alias sprite pixel data for sprites 128-255. */
const MAP_SHARED_ROWS = 32;

interface MapCanvasProps {
  cart: DecodedCart;
  tool: MapTool;
  stamp: Stamp;
  zoom: number;
  selection: Rect | null;
  onSelectionChange: (rect: Rect | null) => void;
  showIndices: boolean;
  onApplyEdits: (edits: MapCellEdit[]) => void;
  onPickStamp: (spriteIndex: number) => void;
}

type DragState =
  | { tool: "select"; start: Point }
  | { tool: "stamp-line"; last: Point }
  | { tool: "pan"; startClientX: number; startClientY: number; startScrollLeft: number; startScrollTop: number }
  | null;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getCellCoords(
  event: { clientX: number; clientY: number },
  canvas: HTMLCanvasElement,
  zoom: number,
): Point {
  const rect = canvas.getBoundingClientRect();
  const cellPx = CELL_SIZE * zoom;
  const x = Math.floor((event.clientX - rect.left) / cellPx);
  const y = Math.floor((event.clientY - rect.top) / cellPx);
  return { x: clamp(x, 0, MAP_WIDTH - 1), y: clamp(y, 0, MAP_HEIGHT - 1) };
}

/**
 * The visible portion of the map within the scrollable container, in map
 * cells — used by the fill tool when there's no selection, per PICO-8's own
 * "fill the visible area if there is no selection". Returns null when the
 * container hasn't been laid out yet (e.g. jsdom in tests), so callers can
 * fall back to the whole map.
 */
function getVisibleCellBounds(container: HTMLDivElement | null, zoom: number): Rect | null {
  if (!container) return null;
  const { scrollLeft, scrollTop, clientWidth, clientHeight } = container;
  if (clientWidth === 0 || clientHeight === 0) return null;
  const cellPx = CELL_SIZE * zoom;
  return {
    x0: clamp(Math.floor(scrollLeft / cellPx), 0, MAP_WIDTH - 1),
    y0: clamp(Math.floor(scrollTop / cellPx), 0, MAP_HEIGHT - 1),
    x1: clamp(Math.ceil((scrollLeft + clientWidth) / cellPx) - 1, 0, MAP_WIDTH - 1),
    y1: clamp(Math.ceil((scrollTop + clientHeight) / cellPx) - 1, 0, MAP_HEIGHT - 1),
  };
}

/**
 * The main map-editing surface: renders the 128x64 grid via `renderMap`
 * (from src/internal/pico8/render.ts, compositing each cell's actual sprite
 * pixels) and dispatches pointer gestures to the active tool. Edits are
 * reported up as `MapCellEdit[]` batches — this component never touches
 * CartContext directly, so the shared-region gfx/map mirroring stays
 * entirely in tools.ts / shared-sprite-region.ts.
 */
export function MapCanvas({
  cart,
  tool,
  stamp,
  zoom,
  selection,
  onSelectionChange,
  showIndices,
  onApplyEdits,
  onPickStamp,
}: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    const grid = renderMap(cart.map, cart.gfx, zoom);
    const imageData = new ImageData(new Uint8ClampedArray(grid.data), grid.width, grid.height);
    ctx.putImageData(imageData, 0, 0);

    const cellPx = CELL_SIZE * zoom;

    if (showIndices) {
      ctx.fillStyle = "#ffffff";
      ctx.font = `${Math.max(6, Math.floor(cellPx / 3))}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let y = 0; y < cart.map.height; y++) {
        for (let x = 0; x < cart.map.width; x++) {
          const spriteIndex = cart.map.cells[cellIndex(x, y)]!;
          ctx.fillText(String(spriteIndex), x * cellPx + cellPx / 2, y * cellPx + cellPx / 2);
        }
      }
    }

    const dividerY = MAP_SHARED_ROWS * cellPx;
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, dividerY + 0.5);
    ctx.lineTo(grid.width, dividerY + 0.5);
    ctx.stroke();
    ctx.fillStyle = "#f59e0b";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText("shared with sprite sheet", 2, dividerY - 2);
    ctx.textBaseline = "top";
    ctx.fillText("map-only", 2, dividerY + 2);

    if (selection) {
      const { left, top, right, bottom } = normalizeRect(selection);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        left * cellPx + 0.5,
        top * cellPx + 0.5,
        (right - left + 1) * cellPx - 1,
        (bottom - top + 1) * cellPx - 1,
      );
    }
  }, [cart.gfx, cart.map, zoom, selection, showIndices]);

  function spriteIndexAt(x: number, y: number): number {
    return cart.map.cells[cellIndex(x, y)]!;
  }

  function pickAt(x: number, y: number) {
    onPickStamp(spriteIndexAt(x, y));
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture?.(event.pointerId);
    const { x, y } = getCellCoords(event, canvas, zoom);

    if (event.button === 2) {
      pickAt(x, y);
      return;
    }
    if (tool === "eyedrop") {
      pickAt(x, y);
      return;
    }
    if (tool === "select") {
      dragRef.current = { tool: "select", start: { x, y } };
      onSelectionChange({ x0: x, y0: y, x1: x, y1: y });
      return;
    }
    if (tool === "fill") {
      const bounds =
        selection ??
        getVisibleCellBounds(containerRef.current, zoom) ?? { x0: 0, y0: 0, x1: MAP_WIDTH - 1, y1: MAP_HEIGHT - 1 };
      onApplyEdits(fillMapArea(MAP_WIDTH, MAP_HEIGHT, bounds, stamp.sprites[0]!));
      return;
    }
    if (tool === "stamp") {
      onApplyEdits(pasteStamp(stamp, x, y));
      if (stamp.width === 1 && stamp.height === 1) {
        dragRef.current = { tool: "stamp-line", last: { x, y } };
      }
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
    const { x, y } = getCellCoords(event, canvas, zoom);

    if (drag.tool === "select") {
      onSelectionChange({ x0: drag.start.x, y0: drag.start.y, x1: x, y1: y });
      return;
    }
    if (drag.tool === "stamp-line") {
      if (x === drag.last.x && y === drag.last.y) return;
      const points = rasterizeLine(drag.last.x, drag.last.y, x, y);
      const edits: MapCellEdit[] = points.flatMap((p) => pasteStamp(singleStamp(stamp.sprites[0]!), p.x, p.y));
      onApplyEdits(edits);
      dragRef.current = { tool: "stamp-line", last: { x, y } };
    }
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  function handleContextMenu(event: MouseEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getCellCoords(event, canvas, zoom);
    pickAt(x, y);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter") {
      onSelectionChange(null);
    }
  }

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Map canvas"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="inline-block max-h-[70vh] max-w-full overflow-auto border border-neutral-700"
    >
      <canvas
        ref={canvasRef}
        data-testid="map-canvas"
        width={MAP_WIDTH * CELL_SIZE * zoom}
        height={MAP_HEIGHT * CELL_SIZE * zoom}
        style={{ cursor: tool === "pan" ? "grab" : "crosshair", display: "block" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={handleContextMenu}
      />
    </div>
  );
}

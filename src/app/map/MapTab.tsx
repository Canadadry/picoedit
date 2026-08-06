import { useState } from "react";
import { useCart } from "../state/CartContext.tsx";
import { MapCanvas } from "./components/MapCanvas.tsx";
import { SpritePicker } from "./components/SpritePicker.tsx";
import { Toolbar } from "./components/Toolbar.tsx";
import {
  applyMapEdits,
  cellIndex,
  copyMapRegion,
  singleStamp,
  type MapCellEdit,
  type Rect,
  type Stamp,
} from "./tools.ts";

export type MapTool = "stamp" | "select" | "fill" | "eyedrop" | "pan";

const DEFAULT_ZOOM = 4;
const MIN_ZOOM = 1;
const MAX_ZOOM = 16;
const SHEET_COLUMNS = 16;
const DEFAULT_STAMP: Stamp = singleStamp(0);

/** Converts a sprite-grid rect (0-15 x 0-15 sprite-index units) from the picker into a Stamp. */
function stampFromPickerRect(rect: Rect): Stamp {
  return copyMapRegion((x, y) => y * SHEET_COLUMNS + x, rect);
}

function pickerRectForSprite(spriteIndex: number): Rect {
  const x = spriteIndex % SHEET_COLUMNS;
  const y = Math.floor(spriteIndex / SHEET_COLUMNS);
  return { x0: x, y0: y, x1: x, y1: y };
}

export function MapTab() {
  const { cart, updateCart } = useCart();
  const [tool, setTool] = useState<MapTool>("stamp");
  const [stamp, setStamp] = useState<Stamp>(DEFAULT_STAMP);
  const [pickerSelection, setPickerSelection] = useState<Rect | null>(pickerRectForSprite(0));
  const [selection, setSelection] = useState<Rect | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [showIndices, setShowIndices] = useState(false);

  if (!cart) {
    return <p className="text-sm text-neutral-400">Load a cart in the File tab first.</p>;
  }

  function applyEdits(edits: MapCellEdit[]) {
    if (edits.length === 0 || !cart) return;
    updateCart(applyMapEdits(cart, edits));
  }

  function handleCopy() {
    if (!selection || !cart) return;
    setStamp(copyMapRegion((x, y) => cart.map.cells[cellIndex(x, y)]!, selection));
    setPickerSelection(null);
  }

  function handlePickStamp(spriteIndex: number) {
    setStamp(singleStamp(spriteIndex));
    setPickerSelection(pickerRectForSprite(spriteIndex));
  }

  function handlePickerSelectionChange(rect: Rect) {
    setPickerSelection(rect);
    setStamp(stampFromPickerRect(rect));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-4">
        <Toolbar
          tool={tool}
          onToolChange={setTool}
          canCopy={selection !== null}
          onCopy={handleCopy}
          showIndices={showIndices}
          onToggleIndices={() => setShowIndices((v) => !v)}
        />
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 1))}
            className="rounded border border-neutral-700 px-2 py-1 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            −
          </button>
          <span className="text-sm text-neutral-400">{zoom}x</span>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 1))}
            className="rounded border border-neutral-700 px-2 py-1 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            +
          </button>
        </div>
      </div>

      <MapCanvas
        cart={cart}
        tool={tool}
        stamp={stamp}
        zoom={zoom}
        selection={selection}
        onSelectionChange={setSelection}
        showIndices={showIndices}
        onApplyEdits={applyEdits}
        onPickStamp={handlePickStamp}
      />

      <SpritePicker sheet={cart.gfx} selection={pickerSelection} onSelectionChange={handlePickerSelectionChange} />
    </div>
  );
}

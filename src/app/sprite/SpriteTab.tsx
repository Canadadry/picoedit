import { useState } from "react";
import type { IntegerRange_0_16 } from "../../internal/pico8/cart-data.ts";
import { getSpritePixel, setSpritePixels, type SpritePixelEdit } from "../state/shared-sprite-region.ts";
import { useCart } from "../state/CartContext.tsx";
import { PaletteSwatch } from "./components/PaletteSwatch.tsx";
import { SpriteCanvas } from "./components/SpriteCanvas.tsx";
import { SpriteNavigator } from "./components/SpriteNavigator.tsx";
import { Toolbar } from "./components/Toolbar.tsx";
import { copyRegion, fillArea, normalizeRect, pasteClipboard, type Clipboard, type Rect } from "./tools.ts";

export type Tool = "draw" | "select" | "stamp" | "fill" | "pan" | "rect" | "oval" | "line";

const DEFAULT_ZOOM = 4;
const MIN_ZOOM = 1;
const MAX_ZOOM = 16;
const DEFAULT_COLOR: IntegerRange_0_16 = 8;
const SPRITE_SIZE = 8;
const SHEET_COLUMNS = 16;

function spriteBounds(spriteIndex: number): Rect {
  const x0 = (spriteIndex % SHEET_COLUMNS) * SPRITE_SIZE;
  const y0 = Math.floor(spriteIndex / SHEET_COLUMNS) * SPRITE_SIZE;
  return { x0, y0, x1: x0 + SPRITE_SIZE - 1, y1: y0 + SPRITE_SIZE - 1 };
}

function selectionToSpriteIndex(selection: Rect | null): number | null {
  if (!selection) return null;
  const { left, top, right, bottom } = normalizeRect(selection);
  if (right - left !== SPRITE_SIZE - 1 || bottom - top !== SPRITE_SIZE - 1) return null;
  if (left % SPRITE_SIZE !== 0 || top % SPRITE_SIZE !== 0) return null;
  return (top / SPRITE_SIZE) * SHEET_COLUMNS + left / SPRITE_SIZE;
}

export function SpriteTab() {
  const { cart, updateCart } = useCart();
  const [tool, setTool] = useState<Tool>("draw");
  const [activeColor, setActiveColor] = useState<IntegerRange_0_16>(DEFAULT_COLOR);
  const [selection, setSelection] = useState<Rect | null>(null);
  const [clipboard, setClipboard] = useState<Clipboard | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  if (!cart) {
    return <p className="text-sm text-neutral-400">Load a cart in the File tab first.</p>;
  }

  function applyEdits(edits: SpritePixelEdit[]) {
    if (edits.length === 0 || !cart) return;
    updateCart(setSpritePixels(cart, edits));
  }

  function handleCopy() {
    if (!selection || !cart) return;
    setClipboard(copyRegion((x, y) => getSpritePixel(cart, x, y), selection));
  }

  function handleCut() {
    if (!selection || !cart) return;
    setClipboard(copyRegion((x, y) => getSpritePixel(cart, x, y), selection));
    applyEdits(fillArea(128, 128, selection, 0));
  }

  function handlePaste() {
    if (!clipboard) return;
    const origin = selection ? normalizeRect(selection) : { left: 0, top: 0 };
    applyEdits(pasteClipboard(clipboard, origin.left, origin.top, false));
  }

  function handleSelectSprite(spriteIndex: number) {
    setSelection(spriteBounds(spriteIndex));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-4">
        <Toolbar
          tool={tool}
          onToolChange={setTool}
          canCopy={selection !== null}
          canPaste={clipboard !== null}
          onCopy={handleCopy}
          onCut={handleCut}
          onPaste={handlePaste}
        />
        <PaletteSwatch activeColor={activeColor} onSelect={setActiveColor} />
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

      <SpriteCanvas
        cart={cart}
        tool={tool}
        activeColor={activeColor}
        zoom={zoom}
        selection={selection}
        onSelectionChange={setSelection}
        clipboard={clipboard}
        onApplyEdits={applyEdits}
        onPickColor={setActiveColor}
        onCopy={handleCopy}
        onCut={handleCut}
        onPaste={handlePaste}
      />

      <SpriteNavigator
        sheet={cart.gfx}
        currentSprite={selectionToSpriteIndex(selection)}
        onSelectSprite={handleSelectSprite}
      />
    </div>
  );
}

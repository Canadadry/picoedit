import { useEffect, useRef } from "react";
import type { SpriteSheet } from "../../../internal/pico8/cart-data.ts";
import { PICO8_PALETTE } from "../../../internal/pico8/palette.ts";
import { cn } from "../../lib/utils.ts";

const SPRITE_SIZE = 8;
const SHEET_COLUMNS = 16;
const SPRITE_COUNT = 256;
const THUMB_ZOOM = 2;

interface SpriteThumbnailProps {
  sheet: SpriteSheet;
  spriteIndex: number;
  isCurrent: boolean;
  onSelect: (spriteIndex: number) => void;
}

function SpriteThumbnail({ sheet, spriteIndex, isCurrent, onSelect }: SpriteThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const originX = (spriteIndex % SHEET_COLUMNS) * SPRITE_SIZE;
  const originY = Math.floor(spriteIndex / SHEET_COLUMNS) * SPRITE_SIZE;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    const imageData = ctx.createImageData(SPRITE_SIZE, SPRITE_SIZE);
    for (let y = 0; y < SPRITE_SIZE; y++) {
      for (let x = 0; x < SPRITE_SIZE; x++) {
        const paletteIndex = sheet.pixels[(originY + y) * sheet.width + (originX + x)]!;
        const rgb = PICO8_PALETTE[paletteIndex]!;
        const base = (y * SPRITE_SIZE + x) * 4;
        imageData.data[base] = rgb[0];
        imageData.data[base + 1] = rgb[1];
        imageData.data[base + 2] = rgb[2];
        imageData.data[base + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }, [sheet, originX, originY]);

  return (
    <button
      type="button"
      aria-label={`Sprite ${spriteIndex}`}
      aria-pressed={isCurrent}
      onClick={() => onSelect(spriteIndex)}
      className={cn("border p-0", isCurrent ? "border-blue-500" : "border-transparent")}
    >
      <canvas
        ref={canvasRef}
        width={SPRITE_SIZE}
        height={SPRITE_SIZE}
        style={{
          width: SPRITE_SIZE * THUMB_ZOOM,
          height: SPRITE_SIZE * THUMB_ZOOM,
          imageRendering: "pixelated",
        }}
      />
    </button>
  );
}

interface SpriteNavigatorProps {
  sheet: SpriteSheet;
  currentSprite: number | null;
  onSelectSprite: (spriteIndex: number) => void;
}

/** A 16x16 grid of all 256 sprite thumbnails, matching PICO-8's native navigator layout. */
export function SpriteNavigator({ sheet, currentSprite, onSelectSprite }: SpriteNavigatorProps) {
  const indices = Array.from({ length: SPRITE_COUNT }, (_, i) => i);
  return (
    <div
      role="group"
      aria-label="Sprite navigator"
      className="grid gap-px"
      style={{ gridTemplateColumns: `repeat(${SHEET_COLUMNS}, max-content)` }}
    >
      {indices.map((spriteIndex) => (
        <SpriteThumbnail
          key={spriteIndex}
          sheet={sheet}
          spriteIndex={spriteIndex}
          isCurrent={spriteIndex === currentSprite}
          onSelect={onSelectSprite}
        />
      ))}
    </div>
  );
}

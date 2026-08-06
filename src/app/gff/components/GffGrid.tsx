import { useEffect, useRef } from "react";
import type { SpriteFlags, SpriteSheet } from "../../../internal/pico8/cart-data.ts";
import { PICO8_PALETTE } from "../../../internal/pico8/palette.ts";
import { cn } from "../../lib/utils.ts";
import { FLAG_COLORS, FLAG_KEYS } from "../flags.ts";

const SPRITE_SIZE = 8;
const SHEET_COLUMNS = 16;
const SPRITE_COUNT = 256;
const THUMB_ZOOM = 2;

interface GffThumbnailProps {
  sheet: SpriteSheet;
  spriteIndex: number;
  flags: SpriteFlags;
  isSelected: boolean;
  onSelect: (spriteIndex: number) => void;
  onToggleFlag: (spriteIndex: number, flagIndex: number) => void;
}

function GffThumbnail({ sheet, spriteIndex, flags, isSelected, onSelect, onToggleFlag }: GffThumbnailProps) {
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
    <div
      className={cn(
        "flex flex-col items-center gap-0.5 border p-0.5",
        isSelected ? "border-blue-500" : "border-transparent",
      )}
    >
      <button type="button" aria-label={`Sprite ${spriteIndex}`} onClick={() => onSelect(spriteIndex)} className="p-0">
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
      <div className="flex gap-px">
        {FLAG_KEYS.map((key, flagIndex) => {
          const on = flags[key];
          return (
            <button
              key={key}
              type="button"
              aria-label={`Sprite ${spriteIndex} flag ${flagIndex}`}
              aria-pressed={on}
              onClick={() => onToggleFlag(spriteIndex, flagIndex)}
              className="h-2 w-2 rounded-full border border-neutral-700"
              style={{ backgroundColor: on ? `rgb(${FLAG_COLORS[flagIndex]!.join(",")})` : "transparent" }}
            />
          );
        })}
      </div>
    </div>
  );
}

interface GffGridProps {
  sheet: SpriteSheet;
  flagsBySprite: SpriteFlags[];
  selectedSprite: number | null;
  onSelectSprite: (spriteIndex: number) => void;
  onToggleFlag: (spriteIndex: number, flagIndex: number) => void;
}

/** A scrollable 16x16 grid of all 256 sprite thumbnails, each with an 8-dot flag summary. */
export function GffGrid({ sheet, flagsBySprite, selectedSprite, onSelectSprite, onToggleFlag }: GffGridProps) {
  const indices = Array.from({ length: SPRITE_COUNT }, (_, i) => i);
  return (
    <div
      role="group"
      aria-label="Sprite flags grid"
      className="grid max-h-[70vh] gap-px overflow-auto"
      style={{ gridTemplateColumns: `repeat(${SHEET_COLUMNS}, max-content)` }}
    >
      {indices.map((spriteIndex) => (
        <GffThumbnail
          key={spriteIndex}
          sheet={sheet}
          spriteIndex={spriteIndex}
          flags={flagsBySprite[spriteIndex]!}
          isSelected={spriteIndex === selectedSprite}
          onSelect={onSelectSprite}
          onToggleFlag={onToggleFlag}
        />
      ))}
    </div>
  );
}

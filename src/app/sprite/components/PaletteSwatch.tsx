import { PICO8_PALETTE } from "../../../internal/pico8/palette.ts";
import type { IntegerRange_0_16 } from "../../../internal/pico8/cart-data.ts";
import { cn } from "../../lib/utils.ts";

interface PaletteSwatchProps {
  activeColor: IntegerRange_0_16;
  onSelect: (color: IntegerRange_0_16) => void;
}

export function PaletteSwatch({ activeColor, onSelect }: PaletteSwatchProps) {
  return (
    <div role="group" aria-label="Palette" className="flex flex-wrap gap-1">
      {PICO8_PALETTE.map((rgb, index) => {
        const color = index as IntegerRange_0_16;
        const isActive = color === activeColor;
        return (
          <button
            key={index}
            type="button"
            aria-label={`Color ${index}`}
            aria-pressed={isActive}
            onClick={() => onSelect(color)}
            className={cn(
              "h-6 w-6 rounded border-2",
              isActive ? "border-white" : "border-neutral-700",
            )}
            style={{ backgroundColor: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` }}
          />
        );
      })}
    </div>
  );
}

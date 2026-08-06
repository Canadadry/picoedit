import type { SpriteFlags } from "../../../internal/pico8/cart-data.ts";
import { cn } from "../../lib/utils.ts";
import { FLAG_COLORS, FLAG_KEYS } from "../flags.ts";

interface GffDetailPanelProps {
  spriteIndex: number;
  flags: SpriteFlags;
  onToggleFlag: (flagIndex: number) => void;
}

/** 8 large, labeled toggles (styled as PICO-8's colored dots) for one sprite's flags. */
export function GffDetailPanel({ spriteIndex, flags, onToggleFlag }: GffDetailPanelProps) {
  return (
    <div
      role="group"
      aria-label={`Sprite ${spriteIndex} flags`}
      className="flex flex-col gap-2 rounded-lg border border-neutral-700 bg-neutral-900 p-4"
    >
      <p className="text-sm text-neutral-300">Sprite {spriteIndex}</p>
      <div className="flex flex-col gap-1">
        {FLAG_KEYS.map((key, flagIndex) => {
          const on = flags[key];
          return (
            <button
              key={key}
              type="button"
              aria-label={`Flag ${flagIndex}`}
              aria-pressed={on}
              onClick={() => onToggleFlag(flagIndex)}
              className={cn(
                "flex items-center gap-2 rounded border px-2 py-1 text-sm",
                on ? "border-neutral-400 text-neutral-100" : "border-neutral-700 text-neutral-400",
              )}
            >
              <span
                className="h-4 w-4 rounded-full border border-neutral-600"
                style={{ backgroundColor: on ? `rgb(${FLAG_COLORS[flagIndex]!.join(",")})` : "transparent" }}
              />
              Flag {flagIndex}
            </button>
          );
        })}
      </div>
    </div>
  );
}

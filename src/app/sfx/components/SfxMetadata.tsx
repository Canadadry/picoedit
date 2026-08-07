import type { Sfx } from "../../../internal/pico8/cart-data.ts";
import { cn } from "../../lib/utils.ts";

const BYTE_MIN = 0;
const BYTE_MAX = 255;

function clampByte(value: number): number {
  if (Number.isNaN(value)) return BYTE_MIN;
  return Math.min(BYTE_MAX, Math.max(BYTE_MIN, Math.trunc(value)));
}

type SfxMetadataPatch = Partial<Pick<Sfx, "speed" | "loopStart" | "loopEnd" | "editorMode">>;

interface SfxMetadataProps {
  sfx: Sfx;
  onEditMetadata: (patch: SfxMetadataPatch) => void;
}

/**
 * Numeric steppers for speed/loopStart/loopEnd (PICO-8's SPD/LOOP controls) plus a two-way
 * editorMode toggle. editorMode is cosmetic-only in native PICO-8 (pitch vs tracker display)
 * and doesn't change this tab's own single-grid UI — it's preserved purely so round-tripping
 * doesn't silently reset the byte PICO-8 itself stores.
 */
export function SfxMetadata({ sfx, onEditMetadata }: SfxMetadataProps) {
  const isTrackerMode = sfx.editorMode === 1;
  return (
    <div role="group" aria-label="Sfx metadata" className="flex flex-wrap items-end gap-4">
      <label className="flex flex-col gap-1 text-xs text-neutral-400">
        Speed
        <input
          type="number"
          aria-label="Speed"
          min={BYTE_MIN}
          max={BYTE_MAX}
          value={sfx.speed}
          onChange={(event) => onEditMetadata({ speed: clampByte(event.target.valueAsNumber) })}
          className="w-16 rounded border border-neutral-700 bg-neutral-900 px-1 py-0.5 text-sm text-neutral-100"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-neutral-400">
        Loop start
        <input
          type="number"
          aria-label="Loop start"
          min={BYTE_MIN}
          max={BYTE_MAX}
          value={sfx.loopStart}
          onChange={(event) => onEditMetadata({ loopStart: clampByte(event.target.valueAsNumber) })}
          className="w-16 rounded border border-neutral-700 bg-neutral-900 px-1 py-0.5 text-sm text-neutral-100"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-neutral-400">
        Loop end
        <input
          type="number"
          aria-label="Loop end"
          min={BYTE_MIN}
          max={BYTE_MAX}
          value={sfx.loopEnd}
          onChange={(event) => onEditMetadata({ loopEnd: clampByte(event.target.valueAsNumber) })}
          className="w-16 rounded border border-neutral-700 bg-neutral-900 px-1 py-0.5 text-sm text-neutral-100"
        />
      </label>
      <button
        type="button"
        aria-label="Editor mode"
        aria-pressed={isTrackerMode}
        onClick={() => onEditMetadata({ editorMode: isTrackerMode ? 0 : 1 })}
        className={cn(
          "rounded border px-2 py-1 text-sm",
          isTrackerMode
            ? "border-blue-500 bg-blue-950/40 text-neutral-100"
            : "border-neutral-700 text-neutral-300 hover:bg-neutral-800",
        )}
      >
        {isTrackerMode ? "Tracker" : "Pitch"}
      </button>
    </div>
  );
}

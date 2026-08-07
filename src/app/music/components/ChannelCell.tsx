import type { IntegerRange_0_64, PatternChannel } from "../../../internal/pico8/cart-data.ts";
import { cn } from "../../lib/utils.ts";

const SFX_MIN = 0;
const SFX_MAX = 63;

function clampSfxId(value: number): IntegerRange_0_64 {
  if (Number.isNaN(value)) return SFX_MIN as IntegerRange_0_64;
  return Math.min(SFX_MAX, Math.max(SFX_MIN, Math.trunc(value))) as IntegerRange_0_64;
}

interface ChannelCellProps {
  patternIndex: number;
  channelIndex: number;
  channel: PatternChannel;
  onEdit: (patch: Partial<PatternChannel>) => void;
}

/**
 * One PatternChannel cell: an on/off toggle (inverted `mute` — off shows "--"
 * and hides the sfx field) and, when on, a direct 0-63 sfx number input
 * replacing PICO-8's left/right-click increment-decrement.
 */
export function ChannelCell({ patternIndex, channelIndex, channel, onEdit }: ChannelCellProps) {
  const isOn = !channel.mute;
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label={`Pattern ${patternIndex} channel ${channelIndex} on`}
        aria-pressed={isOn}
        onClick={() => onEdit({ mute: isOn })}
        className={cn(
          "h-6 w-8 rounded border text-xs",
          isOn
            ? "border-blue-500 bg-blue-950/40 text-neutral-100"
            : "border-neutral-700 text-neutral-500 hover:bg-neutral-800",
        )}
      >
        {isOn ? "on" : "--"}
      </button>
      {isOn ? (
        <input
          type="number"
          aria-label={`Pattern ${patternIndex} channel ${channelIndex} sfx`}
          min={SFX_MIN}
          max={SFX_MAX}
          value={channel.sfxId}
          onChange={(event) => onEdit({ sfxId: clampSfxId(event.target.valueAsNumber) })}
          className="w-14 rounded border border-neutral-700 bg-neutral-900 px-1 py-0.5 text-xs text-neutral-100"
        />
      ) : null}
    </div>
  );
}

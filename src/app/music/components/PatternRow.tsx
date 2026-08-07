import type { MusicPattern, PatternChannel } from "../../../internal/pico8/cart-data.ts";
import { cn } from "../../lib/utils.ts";
import { LOOP_END_CHANNEL, LOOP_START_CHANNEL, STOP_CHANNEL } from "../tools.ts";
import { ChannelCell } from "./ChannelCell.tsx";

interface PatternRowProps {
  patternIndex: number;
  pattern: MusicPattern;
  onEditChannel: (channelIndex: number, patch: Partial<PatternChannel>) => void;
}

function loopButtonClass(active: boolean) {
  return cn(
    "rounded border px-1.5 py-0.5 text-xs",
    active
      ? "border-blue-500 bg-blue-950/40 text-neutral-100"
      : "border-neutral-700 text-neutral-300 hover:bg-neutral-800",
  );
}

interface LoopButtonProps {
  label: string;
  active: boolean;
  glyph: string;
  onClick: () => void;
}

function LoopButton({ label, active, glyph, onClick }: LoopButtonProps) {
  return (
    <button type="button" aria-label={label} aria-pressed={active} onClick={onClick} className={loopButtonClass(active)}>
      {glyph}
    </button>
  );
}

/**
 * One CartData.music row: 4 channel cells plus the 3 pattern-level loop
 * controls (loop start / loop end / stop), bound to pattern[0..2].flag per
 * docs/spec.md §8.4 — pattern[3].flag is unused and never surfaced.
 */
export function PatternRow({ patternIndex, pattern, onEditChannel }: PatternRowProps) {
  return (
    <tr aria-label={`Pattern ${patternIndex}`}>
      <td className="px-1 text-neutral-400">{String(patternIndex).padStart(2, "0")}</td>
      {pattern.map((channel, channelIndex) => (
        <td key={channelIndex} className="px-1">
          <ChannelCell
            patternIndex={patternIndex}
            channelIndex={channelIndex}
            channel={channel}
            onEdit={(patch) => onEditChannel(channelIndex, patch)}
          />
        </td>
      ))}
      <td className="px-1">
        <LoopButton
          label={`Pattern ${patternIndex} loop start`}
          active={pattern[LOOP_START_CHANNEL]!.flag}
          glyph="▶"
          onClick={() => onEditChannel(LOOP_START_CHANNEL, { flag: !pattern[LOOP_START_CHANNEL]!.flag })}
        />
      </td>
      <td className="px-1">
        <LoopButton
          label={`Pattern ${patternIndex} loop end`}
          active={pattern[LOOP_END_CHANNEL]!.flag}
          glyph="↺"
          onClick={() => onEditChannel(LOOP_END_CHANNEL, { flag: !pattern[LOOP_END_CHANNEL]!.flag })}
        />
      </td>
      <td className="px-1">
        <LoopButton
          label={`Pattern ${patternIndex} stop`}
          active={pattern[STOP_CHANNEL]!.flag}
          glyph="■"
          onClick={() => onEditChannel(STOP_CHANNEL, { flag: !pattern[STOP_CHANNEL]!.flag })}
        />
      </td>
    </tr>
  );
}

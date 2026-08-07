import type { MusicPattern, PatternChannel } from "../../internal/pico8/cart-data.ts";

/**
 * Framework-free helpers behind the Music tab's edits, mirroring
 * src/app/sfx/tools.ts's approach: pure, immutable field-patch functions
 * kept unit-testable on their own, with MusicTab.tsx doing the whole-array
 * replace through CartContext.updateCart.
 */

/**
 * Loop-control channel indices within a MusicPattern, per docs/spec.md §8.4's
 * positional semantics: byte 0's flag = loop start, byte 1's = loop end,
 * byte 2's = stop. Byte 3's flag is unused and never surfaced in the UI.
 * The type system doesn't distinguish these positionally (PatternChannel.flag
 * is one generic boolean), so this mapping is hard-coded here rather than
 * modeled as a runtime abstraction, per the PRD's own guidance.
 */
export const LOOP_START_CHANNEL = 0;
export const LOOP_END_CHANNEL = 1;
export const STOP_CHANNEL = 2;

/** Returns a copy of `pattern` with `channels[channelIndex]` patched; every other channel is unchanged. */
export function withEditedChannel(
  pattern: MusicPattern,
  channelIndex: number,
  patch: Partial<PatternChannel>,
): MusicPattern {
  const current = pattern[channelIndex];
  if (!current) {
    throw new Error(`channel index out of range: ${channelIndex}`);
  }
  const updated = pattern.slice() as MusicPattern;
  updated[channelIndex] = { ...current, ...patch };
  return updated;
}

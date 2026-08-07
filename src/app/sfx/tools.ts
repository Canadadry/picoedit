import type { Effect, Note, Sfx } from "../../internal/pico8/cart-data.ts";

/**
 * Framework-free helpers behind the Sfx tab's edits, mirroring
 * src/app/gff/flags.ts's withToggledFlag approach: pure, immutable
 * field-patch functions kept unit-testable on their own, with SfxTab.tsx
 * doing the whole-array replace through CartContext.updateCart.
 */

/** The 8 named Effect values, in cart-sfx.ts's raw 0-7 bit-packing order. */
export const EFFECTS: readonly Effect[] = [
  "none",
  "slide",
  "vibrato",
  "drop",
  "fade_in",
  "fade_out",
  "arp_fast",
  "arp_slow",
];

/** Returns a copy of `sfx` with `notes[noteIndex]` patched; every other note is unchanged. */
export function withEditedNote(sfx: Sfx, noteIndex: number, patch: Partial<Note>): Sfx {
  const current = sfx.notes[noteIndex];
  if (!current) {
    throw new Error(`note index out of range: ${noteIndex}`);
  }
  const notes = sfx.notes.slice();
  notes[noteIndex] = { ...current, ...patch };
  return { ...sfx, notes };
}

type SfxMetadata = Pick<Sfx, "editorMode" | "speed" | "loopStart" | "loopEnd">;

/** Returns a copy of `sfx` with the given metadata fields patched; `notes` is unchanged (same reference). */
export function withEditedMetadata(sfx: Sfx, patch: Partial<SfxMetadata>): Sfx {
  return { ...sfx, ...patch };
}

import type { IntegerRange_0_64 } from "../../internal/pico8/cart-data.ts";

/**
 * Note name <-> pitch (0-63) conversion for the Sfx note grid, per the PRD's
 * "derived from the 0-63 range" decision: standard 12-tone chromatic naming
 * (sharps, not flats) with octave = floor(pitch / 12), giving PICO-8's own
 * roughly-C0-to-D#5 range rather than a raw integer.
 */
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

export function pitchToNoteName(pitch: IntegerRange_0_64): string {
  const octave = Math.floor(pitch / NOTE_NAMES.length);
  const name = NOTE_NAMES[pitch % NOTE_NAMES.length]!;
  return `${name}${octave}`;
}

const NOTE_NAME_PATTERN = /^([A-G]#?)(\d+)$/;

export function noteNameToPitch(name: string): IntegerRange_0_64 {
  const match = NOTE_NAME_PATTERN.exec(name);
  if (!match) {
    throw new Error(`invalid note name: "${name}"`);
  }
  const [, note, octaveText] = match;
  const noteIndex = NOTE_NAMES.indexOf(note as (typeof NOTE_NAMES)[number]);
  if (noteIndex === -1) {
    throw new Error(`invalid note name: "${name}"`);
  }
  const pitch = noteIndex + Number(octaveText) * NOTE_NAMES.length;
  if (pitch < 0 || pitch > 63) {
    throw new Error(`note name out of PICO-8's 0-63 pitch range: "${name}" -> ${pitch}`);
  }
  return pitch as IntegerRange_0_64;
}

/** All 64 note names in pitch order, for populating the pitch dropdown. */
export const ALL_NOTE_NAMES: readonly string[] = Array.from({ length: 64 }, (_, pitch) =>
  pitchToNoteName(pitch as IntegerRange_0_64),
);

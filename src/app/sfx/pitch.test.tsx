import { pitchToNoteName, noteNameToPitch, ALL_NOTE_NAMES } from "./pitch.ts";

test("pitchToNoteName renders pitch 0 as C0, the lowest note in PICO-8's 0-63 pitch range", () => {
  expect(pitchToNoteName(0)).toBe("C0");
});

test("pitchToNoteName renders pitch 63 as D#5, the highest note in PICO-8's 0-63 pitch range", () => {
  expect(pitchToNoteName(63)).toBe("D#5");
});

test("pitchToNoteName wraps octaves every 12 semitones", () => {
  expect(pitchToNoteName(12)).toBe("C1");
  expect(pitchToNoteName(13)).toBe("C#1");
});

test("noteNameToPitch is the exact inverse of pitchToNoteName across the whole 0-63 range", () => {
  for (let pitch = 0; pitch <= 63; pitch++) {
    const name = pitchToNoteName(pitch as never);
    expect(noteNameToPitch(name)).toBe(pitch);
  }
});

test("ALL_NOTE_NAMES lists all 64 note names in pitch order, matching pitchToNoteName", () => {
  expect(ALL_NOTE_NAMES).toHaveLength(64);
  expect(ALL_NOTE_NAMES[0]).toBe("C0");
  expect(ALL_NOTE_NAMES[63]).toBe("D#5");
});

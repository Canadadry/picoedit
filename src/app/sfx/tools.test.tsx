import type { Note, Sfx } from "../../internal/pico8/cart-data.ts";
import { EFFECTS, withEditedMetadata, withEditedNote } from "./tools.ts";

function makeSfx(): Sfx {
  const notes: Note[] = Array.from({ length: 32 }, () => ({
    pitch: 0,
    instrument: 0,
    volume: 0,
    effect: "none",
  }));
  return { notes, editorMode: 1, speed: 16, loopStart: 0, loopEnd: 0 };
}

test("EFFECTS lists the 8 named Effect values in cart-sfx's bit-packing order", () => {
  expect(EFFECTS).toEqual([
    "none",
    "slide",
    "vibrato",
    "drop",
    "fade_in",
    "fade_out",
    "arp_fast",
    "arp_slow",
  ]);
});

test("withEditedNote replaces only the targeted note's patched fields, leaving other notes untouched", () => {
  const sfx = makeSfx();
  const edited = withEditedNote(sfx, 5, { pitch: 30, effect: "slide" });

  expect(edited.notes[5]).toEqual({ pitch: 30, instrument: 0, volume: 0, effect: "slide" });
  expect(edited.notes[4]).toEqual(sfx.notes[4]);
  expect(edited.notes[6]).toEqual(sfx.notes[6]);
  expect(sfx.notes[5]).toEqual({ pitch: 0, instrument: 0, volume: 0, effect: "none" });
});

test("withEditedNote throws on an out-of-range note index instead of silently ignoring it", () => {
  const sfx = makeSfx();
  expect(() => withEditedNote(sfx, 32, { pitch: 1 })).toThrow();
});

test("withEditedMetadata patches only the given metadata fields, leaving notes and the rest untouched", () => {
  const sfx = makeSfx();
  const edited = withEditedMetadata(sfx, { speed: 8, loopEnd: 20 });

  expect(edited).toEqual({ ...sfx, speed: 8, loopEnd: 20 });
  expect(edited.notes).toBe(sfx.notes);
});

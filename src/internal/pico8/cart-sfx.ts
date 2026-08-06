import assert from "node:assert/strict";
import type { CartBytes } from "./cart-bytes.ts";
import type {
  Effect,
  IntegerRange_0_16,
  IntegerRange_0_64,
  IntegerRange_0_8,
  Note,
  Sfx,
} from "./cart-data.ts";

export const SFX_OFFSET = 0x3200;
export const SFX_LENGTH = 4352;

const SFX_COUNT = 64;
const SOUND_LENGTH = 68;
const NOTE_COUNT = 32;
const NOTE_BYTES = NOTE_COUNT * 2;

const EFFECTS: Effect[] = [
  "none",
  "slide",
  "vibrato",
  "drop",
  "fade_in",
  "fade_out",
  "arp_fast",
  "arp_slow",
];

function decodeNote(low: number, high: number): Note {
  const value = low | (high << 8);
  return {
    pitch: (value & 0x3f) as IntegerRange_0_64,
    instrument: ((value >> 6) & 0x0f) as IntegerRange_0_16,
    volume: ((value >> 10) & 0x07) as IntegerRange_0_8,
    effect: EFFECTS[(value >> 13) & 0x07]!,
  };
}

function encodeNote(note: Note): [number, number] {
  const effectRaw = EFFECTS.indexOf(note.effect);
  const value =
    (note.pitch & 0x3f) |
    ((note.instrument & 0x0f) << 6) |
    ((note.volume & 0x07) << 10) |
    ((effectRaw & 0x07) << 13);
  return [value & 0xff, (value >> 8) & 0xff];
}

export function decodeSfx(bytes: CartBytes): Sfx[] {
  const sounds = new Array<Sfx>(SFX_COUNT);
  for (let s = 0; s < SFX_COUNT; s++) {
    const base = SFX_OFFSET + s * SOUND_LENGTH;
    const notes = new Array<Note>(NOTE_COUNT);
    for (let n = 0; n < NOTE_COUNT; n++) {
      const low = bytes[base + n * 2]!;
      const high = bytes[base + n * 2 + 1]!;
      notes[n] = decodeNote(low, high);
    }
    sounds[s] = {
      notes,
      editorMode: bytes[base + NOTE_BYTES]!,
      speed: bytes[base + NOTE_BYTES + 1]!,
      loopStart: bytes[base + NOTE_BYTES + 2]!,
      loopEnd: bytes[base + NOTE_BYTES + 3]!,
    };
  }
  assert.equal(sounds.length, SFX_COUNT, `decoded sfx has unexpected length ${sounds.length}`);
  return sounds;
}

export function encodeSfx(sounds: Sfx[]): Uint8Array {
  assert.equal(
    sounds.length,
    SFX_COUNT,
    `Sfx[] must be ${SFX_COUNT} entries, got ${sounds.length}`,
  );
  const bytes = new Uint8Array(SFX_LENGTH);
  for (let s = 0; s < SFX_COUNT; s++) {
    const sfx = sounds[s]!;
    assert.equal(
      sfx.notes.length,
      NOTE_COUNT,
      `Sfx.notes must be ${NOTE_COUNT} entries, got ${sfx.notes.length}`,
    );
    const base = s * SOUND_LENGTH;
    for (let n = 0; n < NOTE_COUNT; n++) {
      const [low, high] = encodeNote(sfx.notes[n]!);
      bytes[base + n * 2] = low;
      bytes[base + n * 2 + 1] = high;
    }
    bytes[base + NOTE_BYTES] = sfx.editorMode & 0xff;
    bytes[base + NOTE_BYTES + 1] = sfx.speed & 0xff;
    bytes[base + NOTE_BYTES + 2] = sfx.loopStart & 0xff;
    bytes[base + NOTE_BYTES + 3] = sfx.loopEnd & 0xff;
  }
  return bytes;
}

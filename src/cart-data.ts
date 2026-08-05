export interface CartData {
  lua: string;
  gfx: SpriteSheet;
  gff: SpriteFlags[];
  map: MapGrid;
  sfx: Sfx[];
  music: MusicPattern[];
  label: PixelImage;
}

export interface SpriteFlags {
  flag0: boolean;
  flag1: boolean;
  flag2: boolean;
  flag3: boolean;
  flag4: boolean;
  flag5: boolean;
  flag6: boolean;
  flag7: boolean;
}

export type Effect =
  | "none"
  | "slide"
  | "vibrato"
  | "drop"
  | "fade_in"
  | "fade_out"
  | "arp_fast"
  | "arp_slow";

export type IntegerRange_0_8 = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type IntegerRange_0_16 =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15;
export type IntegerRange_0_64 =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24
  | 25
  | 26
  | 27
  | 28
  | 29
  | 30
  | 31
  | 32
  | 33
  | 34
  | 35
  | 36
  | 37
  | 38
  | 39
  | 40
  | 41
  | 42
  | 43
  | 44
  | 45
  | 46
  | 47
  | 48
  | 49
  | 50
  | 51
  | 52
  | 53
  | 54
  | 55
  | 56
  | 57
  | 58
  | 59
  | 60
  | 61
  | 62
  | 63;

export interface Note {
  pitch: IntegerRange_0_64;
  instrument: IntegerRange_0_16;
  volume: IntegerRange_0_8;
  effect: Effect;
}

export interface Sfx {
  notes: Note[];
  editorMode: number;
  speed: number;
  loopStart: number;
  loopEnd: number;
}

export interface PatternChannel {
  sfxId: IntegerRange_0_64;
  mute: boolean;
  flag: boolean;
}

export type MusicPattern = [PatternChannel, PatternChannel, PatternChannel, PatternChannel];

export type LuaFormat =
  | { kind: "recent"; compressed: Uint8Array; decompressedLength: number }
  | { kind: "legacy" }
  | { kind: "raw"; text: string };

export interface SpriteSheet {
  width: 128;
  height: 128;
  pixels: IntegerRange_0_16[];
}
export interface MapGrid {
  width: number;
  height: number;
  cells: number[];
}
// TODO: pinned down for real in step 09
export type PixelImage = unknown;

function isIntegerInRange(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}

function isNoteValid(note: Note): boolean {
  return (
    isIntegerInRange(note.pitch, 0, 63) &&
    isIntegerInRange(note.instrument, 0, 15) &&
    isIntegerInRange(note.volume, 0, 7)
  );
}

function isSfxValid(sfx: Sfx): boolean {
  return sfx.notes.length === 32 && sfx.notes.every(isNoteValid);
}

function isPatternChannelValid(channel: PatternChannel): boolean {
  return isIntegerInRange(channel.sfxId, 0, 63);
}

export function isValid(cart: CartData): boolean {
  if (cart.gff.length !== 256) return false;
  if (cart.sfx.length !== 64) return false;
  if (!cart.sfx.every(isSfxValid)) return false;
  if (cart.music.length !== 64) return false;
  if (!cart.music.every((pattern) => pattern.every(isPatternChannelValid))) {
    return false;
  }
  return true;
}

# Spec — PICO-8 cart (`.p8.png`) extraction/compaction toolkit

## 1. Context and objective

TypeScript tool, embedded in a React application, that lets you:
1. **extract** a `.p8.png` file into a set of easy-to-edit text/binary files,
2. **compact** those files back into a valid `.p8.png` loadable by PICO-8.

Product goal: offer an editing interface that's more modern and pleasant than the native PICO-8 editor, by manipulating readable text files instead of the binary/steganographic format.

## 2. Functional scope

- **Target format**: only the recent cart format (move-to-front compression + unary coding). No support for the old uncompressed format — a prior conversion will be done if needed.
- **Sections covered**: all of them — Lua code, sprites (gfx), sprite flags (gff), map, sound effects (sfx), music, label/cover image.
- **Environment**: React only, browser only (no Node.js/CLI in the initial scope).
- **Packaging**: the extraction/compaction module must be an **independent, publishable package**, decoupled from the React app.

## 3. Layered architecture

The full pipeline is split into independent layers, each with a single responsibility:

```
PNG file (raw bytes)
      │  ← third-party PNG lib (never re-tested by us)
      ▼
Raw pixel grid ("BMP")                   ← stable abstraction layer
      │  ← steganographic extraction/injection (LSB of the 4 ARGB channels)
      ▼
Cart data (32 KB)
      │  ← MTF/unary (de)compression + SHA1 computation/verification
      ▼
Structured sections (lua, gfx, gff, map, sfx, music, label)
      │  ← per-section serialization/deserialization
      ▼
Editable files (lua.lua, gfx.xpm, map.csv, gff.json, sfx.json, music.json, label.ppm)
```

The PNG file itself (its bytes on disk) **is never guaranteed to be bit-exact** between the original and the recompacted version. This isn't a problem: PICO-8 decodes the image and then reads the pixels, without ever comparing the file's bytes. Two byte-different PNGs can decode to strictly identical pixels.

## 4. Cartridge format (established facts)

- PNG image **160×205 pixels** = 32,800 pixels = 32 KB of cart data.
- Each cart byte is spread across the **2 least-significant bits** of each channel, in **A, R, G, B** order (the A channel carries the byte's 2 most-significant bits).
- Bytes **0x8006–0x8019**: SHA1 of the first 32,000 bytes (0x0000–0x7FFF), checked by PICO-8 on load — the cartridge is rejected as corrupted if it doesn't match.
- Bytes **0x801A–0x801F**: reserved, currently zero.
- Limit: compressed Lua code must be **under 15,608 bytes** (the Lua region is `0x4300-0x7fff`, 15,616 bytes, minus the 8-byte recent-format header), so the total fits within 32 KB.
- The **last 128 sprites** of the sprite sheet (bottom of the sheet) can also serve as the **bottom of the map** — data shared in PICO-8 memory.
- The Lua code's **first two lines**, if they start with `--`, are used as the title/byline shown on the label image.

⚠️ The SHA1 is data internal to the cart (within the 32 KB hidden in the pixels), **not** PNG container metadata (no dedicated `tEXt`/`iTXt` chunk).

## 5. Output format (extraction)

The primary interchange format is the strongly-typed `CartData` TypeScript structure (see §8.7) — this is what extraction produces and compaction consumes. On-disk "editable files" are a thin, generic serialization of that structure: **flat** folder, one file per section, each file being `JSON.stringify` of the corresponding `CartData` field (no bespoke per-section text format):

| File | Content | Format |
|---|---|---|
| `lua.lua` | Lua source code (decompressed), including the 2 title/byline lines as a comment | Raw Lua text, matching native PICO-8 behavior |
| `gfx.json` | Sprite sheet (`CartData.gfx`) | JSON |
| `map.json` | Map, **including the shared sprite/map area** so the file is self-contained (`CartData.map`) | JSON |
| `gff.json` | Sprite flags (`CartData.gff`, 256 entries) | JSON |
| `sfx.json` | Sound effects (`CartData.sfx`, 64 entries) | JSON |
| `music.json` | Music patterns (`CartData.music`, 64 entries) | JSON |
| `label.json` | Cartridge label/cover image (`CartData.label`) | JSON |

Header metadata (SHA1, version ID, reserved bytes): **never hand-edited**, entirely derived/recomputed at compaction time, transparently.

> **Deviation from earlier draft**: an earlier version of this spec specified bespoke human-editable text formats per section (XPM for sprites, CSV for the map, PPM for the label), chosen for hand-editability outside a TypeScript consumer. That goal was dropped — the actual target is the typed `CartData` structure; on-disk files are a generic, uniform JSON serialization of it, not a hand-crafted format.

## 6. Technical choices

- **PNG read/write**: a third-party PNG lib in JS/TS dedicated to pixel-by-pixel manipulation. **No native Canvas** for this step — 2D Canvas applies premultiplied alpha in some compositing pipelines, which can silently alter the R/G/B channels carrying data when alpha ≠ 255. Canvas is still used for the React app's UI, never for PNG encoding/decoding.
- **Sprite/map format**: no bespoke text format — the structured section (`CartData.gfx` / `CartData.map`, see §8.7) is the primary artifact; the on-disk file is a generic `JSON.stringify` of it.
- **Palette**: fixed standard PICO-8 palette (16 colors), no custom/extended palette handling in the initial scope.

## 7. Integration test strategy

**Testing methodology**: integration tests against real `.p8.png` fixtures in `cart/` at the repo root come first and are the default for every correctness assertion in this project — decode a real cartridge, exercise the function(s) under test, and assert against the fixture's own bytes/pixels. For straightforward, fixed 1:1 byte-layout sections (gff, gfx, map, sfx, music, label, header), a fixture-based bit-exact round-trip test is sufficient on its own and no hand-crafted synthetic unit test should be added alongside it — a real fixture already exercises every bit pattern a synthetic case would, without a second hand-maintained expectation to keep in sync with the format.

This is not a blanket ban on unit tests, though: for genuinely complex algorithmic logic (e.g. a multi-branch bit-level compression/decompression scheme) where a real fixture's output is opaque and a subtle bug in one branch could still coincidentally round-trip correctly, a small hand-traced synthetic test that pins down one specific branch is legitimate and should be kept alongside the fixture-based integration test, not instead of it. Use judgment: if a fixture-based round-trip test alone would actually catch a realistic bug, skip the synthetic test; if it plausibly wouldn't (because the algorithm has independent branches a single fixture's data might not exercise, or a compensating error could still pass), add one narrowly-scoped hand-traced case for that branch.

Error-path tests (asserting a function throws on malformed/truncated input) are dropped for now rather than kept as hand-crafted exceptions — no real fixture can produce malformed input, so for the moment these code paths go untested. Once the real-fixture integration suite above is fully passing, a dedicated PRD will add deliberately-malformed `.p8.png` fixtures (truncated, corrupted-length sections, bad SHA1, etc.) so error paths can be integration-tested the same way as everything else, instead of via hand-crafted byte arrays.

**A single integration test, with two nested levels**, run against a fixtures folder made of real `.p8.png` files.

### Level 1 — steganographic layer (pixels ↔ cart data)

```
PNG → decode raw pixels → extract bits (ARGB LSB) → cart data (32 KB)
    → verify internal SHA1
    → recompact cart data → re-encode into raw pixels
    → assert re-encoded_pixels === original_pixels
    → reinject into a PNG file (via the third-party lib, not tested on its own)
```

### Level 2 — extension "downward", without modifying level 1

```
cart data (32 KB) → decode into sections (lua, gfx, gff, map, sfx, music, label)
                  → recompress the sections → cart data'
                  → assert cart_data' === cart_data (32 KB bit-identical)
                  → (naturally flows back up into level 1: pixels and PNG regenerated)
```

**What is never tested directly**: the PNG format itself (low-level container encoding/decoding) — delegated to, and trusted from, the third-party PNG lib.

**Overall success criterion**: bit-exact on the pixels AND on the 32 KB of cart data. The final PNG file (its raw bytes on disk), however, doesn't need to be identical to the original.

## 8. Technical detail of sections and algorithms

### 8.1 32 KB memory map

| Offset | Content | Size |
|---|---|---|
| `0x0000` | gfx (sprite sheet) | 4 KB |
| `0x1000` | gfx2/map2 (shared sprite/map area, bottom of the map) | 4 KB |
| `0x2000` | map | 4 KB |
| `0x3000` | gff (sprite flags, 1 byte × 256 sprites) | 256 B |
| `0x3100` | music (64 patterns × 4 B) | 256 B |
| `0x3200` | sfx (64 sounds × 68 B) | 4,352 B |
| `0x4300` | Lua code (raw or compressed) | up to `0x7fff` |
| `0x8000-0x801f` | cart header (version, platform, SHA1) | 32 B |

Reminder: `map.csv` will cover `0x2000-0x2fff` **and** the duplicated area `0x1000-0x1fff` (decision made: the cart must be openable even without reconstructing the full gfx context).

### 8.2 Detection and decoding of the Lua code (offset `0x4300`)

The marker on the first 4 bytes determines the format:
- `\x00 p x a` → **recent format** (the only one supported by the toolkit).
- `: c : \x00` → old format (out of scope, a prior conversion is expected).
- Otherwise → raw ASCII text up to the first null byte.

**Recent format** — 8-byte header at `0x4300`:
- `0x4304-0x4305`: length of the decompressed code (MSB first)
- `0x4306-0x4307`: length of the compressed data + 8 (MSB first)
- `0x4308` onward: compressed stream

Decoding maintains a "move-to-front" lookup table of the 256 possible byte values (initialized to identity) and reads the stream **bit by bit, from the LSB to the MSB of each byte**. Each bit group starts with a header bit:
- **bit = 1**: read an index encoded in unary + fixed bits, pointing into the move-to-front table; the found byte is emitted to the output, then moved to the front of the table.
- **bit = 0**: read an offset/length pair (offset encoded on 5, 10, or 15 bits depending on 2 selector bits; length encoded in groups of 3 bits, accumulated as long as the group equals 7). Step back "offset" characters into the output already produced, copy "length" characters — the length can exceed the offset, in which case the pattern repeats. Special case: if the offset is encoded on 10 bits and equals 1, it's not a copy but the start of an uncompressed character block, read 8 bits at a time up to a null byte.

This algorithm (move-to-front + unary) is symmetric: the compactor will need to implement the matching encoder, optimizing to stay under the 15,360-byte compressed limit.

### 8.3 sfx (offset `0x3200`, 68 bytes × 64 sounds)

Per sound: 32 notes × 2 bytes, then 4 bytes of metadata. Each note (16 bits) encodes: pitch (6 bits, 0-63), waveform/instrument (4 bits, 0-F — 0-7 standard waveforms, 8-F custom instruments derived from sfx 0-7), volume (3 bits), effect (3 bits: none/slide/vibrato/drop/fade_in/fade_out/arp fast/arp slow). The 4 metadata bytes: editor/filter mode, playback speed, loop start and end.

### 8.4 music (offset `0x3100`, 4 bytes × 64 patterns)

A pattern = 4 bytes, one per channel (0 to 3). Within each byte: bits 0-5 = sfx ID played on that channel (0-63), bit 6 = mute (1 = channel silent for this pattern), bit 7 = playback control flag, whose meaning depends on the byte's position within the pattern:
- byte 0, bit 7: "loop start" flag
- byte 1, bit 7: "loop end" flag
- byte 2, bit 7: "stop" flag
- byte 3, bit 7: unused

Playback logic: at the end of a pattern, if its "stop" flag is set, playback stops; otherwise if "loop end" is set, jump back to the previous pattern marked "loop start" and resume from there; otherwise simply move on to the next pattern.

### 8.5 "label" area of the `.p8.png`

No sub-region to isolate: the entire 160×205 image is already the cartridge's visible image, composed by PICO-8 on save (cartridge template + F7 screenshot + optional title/byline). `label.ppm` is thus obtained simply by reading the **6 most-significant bits** of each ARGB channel over the **entire** image (complementary to the 2 least-significant bits used by the 32 KB steganography), with no particular coordinates to know.

### 8.6 Output file format (decisions made)

- **All sections except `lua`**: the structured `CartData` TypeScript type (§8.7) is the canonical in-memory representation. The on-disk file for each section is `JSON.stringify` of the corresponding field — no bespoke per-section text format (supersedes the XPM/CSV/PPM formats from an earlier draft of this spec).
- **`gff`**: represented internally as `SpriteFlags` (8 named booleans per sprite, §8.7) — not a raw bitmask integer — since the target is a typed structure, not a binary-layout-mirroring format.
- **`label`**: represented internally as `PixelImage` (§8.7), derived from the high 6 bits of the whole image (see §8.5).
- **`gfx` / `map` color/sprite indices**: PICO-8 color/sprite indices (0-15 / 0-255) directly, with no declared palette table (it's fixed and known in advance).

### 8.7 Structured section types (`CartData`)

The canonical in-memory representation of a decoded cart. Extraction produces a `CartData`; compaction consumes one. `SpriteSheet`, `MapGrid`, `PixelImage` are placeholders, pinned down alongside the steps that implement those sections.

```ts
// the raw 32KB blob — branded so a plain Uint8Array can't be passed where cart bytes are expected
export type CartBytes = Uint8Array & { __cartBytesBrand: unique symbol };

export interface CartData {
  lua: string;
  gfx: SpriteSheet;
  gff: SpriteFlags[];        // length 256
  map: MapGrid;
  sfx: Sfx[];                // length 64
  music: MusicPattern[];     // length 64
  label: PixelImage;
}

export interface SpriteFlags {
  flag0: boolean; flag1: boolean; flag2: boolean; flag3: boolean;
  flag4: boolean; flag5: boolean; flag6: boolean; flag7: boolean;
}

export type Effect = "none" | "slide" | "vibrato" | "drop" | "fade_in" | "fade_out" | "arp_fast" | "arp_slow";

// range types are named after their range, not their role — the field name carries the meaning
export type IntegerRange_0_8 = 0|1|2|3|4|5|6|7;                        // e.g. Note.volume
export type IntegerRange_0_16 = 0|1|2|3|4|5|6|7|8|9|10|11|12|13|14|15; // e.g. Note.instrument, a pixel color index
export type IntegerRange_0_64 =                                        // e.g. Note.pitch, PatternChannel.sfxId
  | 0|1|2|3|4|5|6|7|8|9|10|11|12|13|14|15
  | 16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31
  | 32|33|34|35|36|37|38|39|40|41|42|43|44|45|46|47
  | 48|49|50|51|52|53|54|55|56|57|58|59|60|61|62|63;

export interface Note {
  pitch: IntegerRange_0_64;
  instrument: IntegerRange_0_16;
  volume: IntegerRange_0_8;
  effect: Effect;
}

export interface Sfx {
  notes: Note[];        // length 32
  editorMode: number;
  speed: number;
  loopStart: number;
  loopEnd: number;
}

export interface PatternChannel {
  sfxId: IntegerRange_0_64;
  mute: boolean;
  flag: boolean;  // meaning depends on channel position (loop start / loop end / stop) — see §8.4
}

export type MusicPattern = [PatternChannel, PatternChannel, PatternChannel, PatternChannel]; // exactly 4 channels

export type LuaFormat =
  | { kind: "recent"; compressed: Uint8Array; decompressedLength: number }
  | { kind: "legacy" }   // detected only to throw a clear "unsupported" error
  | { kind: "raw"; text: string };

// SpriteSheet, MapGrid, PixelImage: TBD, pinned down alongside their implementation steps
```

#### `isValid`

```ts
export function isValid(cart: CartData): boolean;
```

Single source of truth for what makes a `CartData` structurally valid. Checks:
- `cart.gff.length === 256`
- `cart.sfx.length === 64`, and for every `Sfx`, `notes.length === 32`
- `cart.music.length === 64`
- for every `Note`: `pitch` in `0-63`, `instrument` in `0-15`, `volume` in `0-7`
- for every `PatternChannel`: `sfxId` in `0-63`

Used at parse/construction boundaries: code that builds a `CartData` (e.g. cart-bytes decoding) calls `isValid` and throws with a descriptive message if it returns `false`, rather than duplicating these checks ad hoc at each call site.

All the technical unknowns identified in section 8 are now resolved — no open points remain before implementation.

## 9. Sources

- **`.p8.png` format (ARGB mapping, header, compression markers, new/old compression algorithms)**: [PICO-8 Wiki — P8PNGFileFormat](https://pico-8.fandom.com/wiki/P8PNGFileFormat)
- **`.p8` text format (`__gfx__`, `__gff__`, `__map__`, `__sfx__`, `__music__` sections, hex encoding)**: [PICO-8 Wiki — P8FileFormat](https://pico-8.fandom.com/wiki/P8FileFormat)
- **Full memory map (gfx/map/gff/song/sfx/user data/draw state/etc. offsets)**: [PICO-8 Wiki — Memory](https://pico-8.fandom.com/wiki/Memory); confirmed by the [official PICO-8 manual](https://www.lexaloffle.com/dl/docs/pico-8_manual.html) and the [API cheatsheet](https://pico-8.github.io/pico8-api/)
- **Step-by-step walkthrough for decoding the steganography and the two compression algorithms (with pseudocode)**: [Roberto Vaccari — Steganography: decoding Pico-8 cartridges](https://robertovaccari.com/blog/2021_01_03_stegano_pico8/)
- **Detailed sfx (68 bytes, 16-bit notes, pitch/waveform/volume/effect) and music (4 bytes/pattern, bit 7 loop flags) structures**: [Lexaloffle forum — Data structures for sfx and music](https://www.lexaloffle.com/bbs/?tid=2341)
- **Confirmation of the PNG-byte → cart-address mapping (`0xc400 / 4 == 0x3100`)**: [picotool issue #108](https://github.com/dansanderson/picotool/issues/108)
- **Official reference source code (pxa/legacy compression in C, open license)**: [github.com/dansanderson/lexaloffle](https://github.com/dansanderson/lexaloffle) — files `pxa_compress_snippets.c` and `p8_compress.c`
- **Reference Python implementation reading/writing `.p8` and `.p8.png`**: [picotool](https://github.com/dansanderson/picotool)
- **Reference tool for `.p8.png` minification/compression/roundtrip**: [shrinko8](https://github.com/thisismypassport/shrinko8)
- **Original post describing the compression format** (forum, 2015, basis of later specs): [Lexaloffle BBS — Cartridge storage and code compression scheme](https://www.lexaloffle.com/bbs/?tid=2400)

## 10. Confirmed out of scope

- Conversion from the old cart format (pre-0.2.0, `:c:\x00` marker) — expected to be handled upstream by the user, out of scope for the toolkit itself.

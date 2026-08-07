---
title: "React app: Sfx tab (sound effects editor)"
description: "A tracker-style editor for the 64 sound effect slots — every Sfx/Note field editable in a grid, no audio synthesis/preview in this pass."
status: needs-triage
---

## Problem Statement

`CartData.sfx` (64 `Sfx` entries, each 32 `Note`s plus speed/loop/editor-mode metadata, see `src/internal/pico8/cart-data.ts` and `src/internal/pico8/cart-sfx.ts`) currently has no editing surface at all — it can only be read/written as raw `sfx.json` via the CLI (PRD 14). PICO-8's own sfx editor packs this into a small fixed-size window with a piano-roll ("pitch mode") and a tracker grid ("tracker mode"), one of 64 sound slots at a time, `SPACE` to preview. This PRD gives the Sfx tab a full-size version of that same editing capability.

## Solution

`src/app/sfx/SfxTab.tsx` + `src/app/sfx/components/`, reading/writing `CartContext.cart.sfx` (an array of 64 `Sfx`). Layout:

- **Slot picker** (`components/SfxSlotList.tsx`): an 8×8 grid of the 64 slots (numbered 00-63, matching PICO-8's own numbering), the selected slot highlighted. Clicking selects it; no drag-reorder (slots are addressed by index everywhere else in the cart — a music `PatternChannel.sfxId` — so slots don't move).
- **Note grid** (`components/SfxNoteGrid.tsx`): the selected `Sfx`'s 32 `Note`s as rows, one column each for pitch, instrument, volume, effect — every field directly editable (pitch via a dropdown/piano-key picker showing note name + octave derived from the 0-63 range, per PICO-8's `C0`-`C5`-ish note naming; instrument 0-15; volume 0-7; effect one of the 8 named `Effect` values). This single table is the whole editing surface — it already exposes every field losslessly, unlike native PICO-8's split between a faster-but-lossy-to-read "pitch mode" (paint pitches by dragging, other fields hidden) and a complete-but-manual "tracker mode" (this grid). Building the drag-paint pitch mode as an additional *input method* over the same data is a reasonable v2 addition, not required for parity, and is called out in Further Notes rather than built here.
- **Metadata panel** (`components/SfxMetadata.tsx`): numeric steppers for `speed`, `loopStart`, `loopEnd`, matching PICO-8's SPD/LOOP controls. `editorMode` (0 = pitch, 1 = tracker in native PICO-8 — cosmetic only, per the PICO-8 wiki: "only change how the SFX is displayed but don't affect the sound") is preserved as a simple two-way toggle bound directly to that field, so round-tripping through this app doesn't silently reset a value PICO-8 itself stores — but toggling it does **not** change this tab's own editing UI (there's only one grid, described above), it only changes the byte written back.

No audio synthesis or playback is implemented in this PRD — see Out of Scope.

## User Stories

1. As a user, I want to pick any of the 64 sfx slots and see/edit its 32 notes in a full-size grid, so that I'm not squinting at PICO-8's tiny tracker.
2. As a user, I want every note field (pitch, instrument, volume, effect) directly editable with named values (e.g. "vibrato", not raw `2`), so that I don't need to know the bit-packing to make a sound.
3. As a user, I want to adjust a sound's speed and loop points, so that I can control playback pacing and looping the same way PICO-8's SPD/LOOP controls do.
4. As a user opening a cart that already has custom or unusual instrument assignments, I want those values preserved even though I can't design a *new* custom-waveform instrument in this tab yet, so that editing an unrelated note in the same sound doesn't corrupt data I can't see.

## Implementation Decisions

- Depends on PRD 18 (landed — app shell, routing, `CartContext`) and PRD 16 (landed — repo restructure — imports become `src/internal/pico8/cart-data.ts` etc.) landing first.
- Pitch (`IntegerRange_0_64`) is displayed as a note name + octave (a small pure `pitchToNoteName`/`noteNameToPitch` pair of helpers in `src/app/sfx/pitch.ts`), not a raw 0-63 number, since that's how both PICO-8 itself and any musician would read it.
- Instrument slots 8-15 ("custom instruments derived from sfx 0-7" per PICO-8's own docs) are selectable in the dropdown like any other instrument value (0-15) — this tab does not attempt to show *what* a custom instrument sounds like or let you author one; it's just an integer field like any other `Note` property, preserved and editable, matching how e.g. `gff`'s flags are edited as plain data without needing the map renderer to exist first.
- Edits go through `CartContext.updateCart({ sfx: <new array> })` (immutable replace of the whole `sfx` array on any single-note edit, same pattern every other tab uses) — no per-slot or per-note fine-grained context actions, keeping `CartContext`'s API surface from PRD 18 unchanged.

## Testing Decisions

- Component tests (Vitest + React Testing Library, jsdom) render `SfxTab` inside a real `CartProvider` loaded with an actual fixture from `cart/`, and assert: the slot picker's 64 slots and the selected slot's note grid/metadata panel match that fixture's actual decoded `sfx` values (cross-checked against the same fixture's `sfx.json`, producible via `cli decode` for the assertion baseline); editing a handful of fields across different slots via `userEvent` updates `CartContext`'s `sfx` array correctly; and a round-trip (encode the result then decode it again in the test itself) shows the edited fields changed and everything untouched is byte-identical to the original. Pure-value display (pitch/instrument/volume/effect dropdowns, numeric steppers) needs no canvas/visual check, so no manual-only gap remains for this tab beyond eyeballing overall layout once.

## Out of Scope

- **Audio synthesis/playback** (Web Audio recreation of PICO-8's waveforms, effects, and custom-instrument playback so a note/sound can be heard while editing, the way `SPACE`/`SHIFT+SPACE` do natively). This is the single biggest capability gap versus native PICO-8 — sfx authoring is fundamentally an audio task, and editing "blind" is a real usability cost — but bit-accurate synthesis of 8 waveforms + effects (slide/vibrato/drop/fades/arpeggio) + the custom-instrument/waveform-drawing mode is a substantial, self-contained problem that deserves its own PRD rather than being bundled into the first data-editing pass. Flagged prominently for review — if this is wanted before or alongside the rest of this tab, say so and it becomes its own (probably next) PRD.
- The "pitch mode" drag-to-paint interaction and the "waveform instrument" mode (using an sfx's note data as raw drawable waveform samples) — public documentation on the latter is thin/uncertain without hands-on PICO-8 access, and `CartData`'s current `Sfx`/`Note` types don't model a distinct "this sfx is a waveform, not notes" flag. Revisit once there's a concrete need (a real fixture that actually uses it) rather than guessing at the format now.
- The 6 filter toggles referenced in some PICO-8 documentation (NOIZ/BUZZ/DETUNE/REVERB/DAMPEN) — sourced only from secondary summaries during this research pass, not confidently verified, and not represented in `CartData.Sfx` today; not built until verified against a primary source or a real cart exercising them.
- Keyboard-driven note entry (PICO-8's `q2w3er5t6y7ui zsxdcvgbhnjm` piano-key-to-pitch typing shortcut) — the dropdown/picker in the note grid covers the same capability with a mouse; a keyboard shortcut layer can be added later without changing the data model.

## Further Notes

The audio-playback cut is the judgment call most likely to need revisiting: without it, this tab can *hold and edit* every byte PICO-8's sfx editor can, but can't *audition* a sound, which is arguably the point of a sound editor. Recommend treating "Sfx playback" as PRD 23a/25 (a Web Audio synthesis engine reusable by both the Sfx tab and the Music tab's pattern playback), built right after this one lands, rather than skipping it indefinitely.

Sources consulted: PICO-8 manual (lexaloffle.com/dl/docs/pico-8_manual.html), PICO-8 wiki SfxEditor summaries, and Lexaloffle forum discussion of the sfx/music editor (bbs tid=2164) — no hands-on PICO-8 session, so anything not cross-confirmed across sources is treated as unverified and pushed to Out of Scope rather than asserted as fact.

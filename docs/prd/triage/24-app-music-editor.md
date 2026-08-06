---
title: "React app: Music tab"
description: "Editor for CartData.music — a scrollable list of 64 patterns, each showing 4 channels with sfx assignment, mute, and pattern-level loop-start/loop-end/stop controls."
status: needs-triage
---

## Problem Statement

PICO-8's native music editor packs pattern navigation, per-channel sfx assignment, and loop/stop playback controls into its fixed low-res window, with sfx numbers set by left/right-click increment rather than direct entry. There's no way yet, in this app, to view or edit `CartData.music` at all — the Music route (added by PRD 18) is currently a placeholder.

## Solution

The Music tab (`src/app/music/MusicTab.tsx`) shows all 64 patterns (`CartData.music`, indices 0-63) as a vertically scrollable list of rows. Each row is one pattern and shows:
- **4 channel cells** (`PatternChannel` at indices 0-3), each with: an on/off toggle (inverted `mute` — off shows "--" and disables the sfx field, on reveals it) and, when on, a numeric sfx selector (0-63) replacing PICO-8's left-click/right-click increment-decrement with a direct number input — same capability (assign any of the 64 sfx slots), faster to use.
- **3 pattern-level loop controls** — Loop Start, Loop End, Stop — shown once per row, not once per channel. These map onto `pattern[0].flag`, `pattern[1].flag`, `pattern[2].flag` respectively (per `docs/spec.md` §8.4's positional semantics); `pattern[3].flag` is unused and never surfaced in the UI. This mirrors how PICO-8's own editor presents loop controls once per pattern (not as 4 independent per-channel toggles), even though the underlying bytes are positional.

No audio plays anywhere in this tab — see Implementation Decisions for why.

## User Stories

1. As a user with a cart loaded, I want to see all 64 music patterns at once (scrollable), so that I can find and jump to the one I want to edit without paging through screens.
2. As a user, I want to assign any sfx slot (0-63) to any channel of any pattern by typing/selecting a number, so that I don't have to click through 63 increments to reach a high sfx number like PICO-8's own editor requires.
3. As a user, I want to mark a pattern as "loop start," another as "loop end," and another as "stop," so that the exported cart's music plays back in the right order/loop, matching what PICO-8 itself would do.
4. As a user, I want a channel with no sound to clearly show as off/empty, so that I can tell at a glance which channels are actually contributing to a pattern.

## Implementation Decisions

- **Data mapping**: `mute: boolean` per channel drives the on/off toggle (per `docs/spec.md` §8.4, "bit 6 = mute (1 = channel silent for this pattern)" — this is the "--" state, not a separate concept from "on/off"). Toggling on with no prior sfx defaults `sfxId` to `0`; toggling off leaves the last `sfxId` in place (untouched) so re-enabling restores it, avoiding accidental data loss on a stray click.
- **Loop control mapping**: exactly 3 buttons/icons per row bound to `pattern[0].flag` / `pattern[1].flag` / `pattern[2].flag`. The type system doesn't distinguish these positionally (`PatternChannel.flag` is one generic boolean per docs/prd/done/08-music.md), so `MusicTab`'s update logic must know and hard-code this index-to-meaning mapping — worth a short comment at the call site referencing spec §8.4, not a runtime abstraction, since it's fixed and only used in one place.
- **No playback/audio in this tab**: this app is a pure data editor (no Lua/game execution anywhere, per PRD 18), and there is currently no sfx-synthesis code in `src/internal/pico8/` at all — decoding/encoding sfx bytes is not the same as being able to render them as sound. Building a Web Audio synthesizer matching PICO-8's waveforms is a substantial, independent effort belonging to the Sfx tab (PRD 23) if anywhere, not this one. The Music tab is pattern-assignment editing only, with no "preview" playback button, now or as an implied near-term follow-up.
- **Relationship to the Sfx tab (PRD 23)**: soft dependency, not a hard blocker. The sfx selector here is a plain 0-63 number input that works standalone. If PRD 23 lands first, a nice-to-have (not required) enhancement is showing each sfx slot's name/first-note-preview next to its number instead of a bare digit — left as a follow-up, not designed here, so this PRD doesn't block on PRD 23's internal component shapes.
- Reuses `CartContext` from PRD 18 (`src/app/state/CartContext.tsx`) via `updateCart({ music: ... })` on every edit — same pattern every other section tab uses.
- Follows the established folder shape: `src/app/music/MusicTab.tsx` + `src/app/music/components/` (e.g. a `PatternRow.tsx`, `ChannelCell.tsx`).

## Testing Decisions

Component tests (Vitest + React Testing Library, jsdom) render `MusicTab` inside a real `CartProvider` loaded with an actual fixture from `cart/`, and assert: all 64 patterns render with their actual decoded values; editing a channel's sfx id and a loop flag via `userEvent` updates `CartContext`'s `music` array correctly; and a round-trip (encode the result then decode it again in the test itself, the same path `src/cmd/cli.ts` exercises) confirms the edited pattern round-trips correctly through `encodeMusic`/`decodeMusic` (already bit-exact per `docs/prd/done/08-music.md`). This tab is plain data/table editing with no canvas rendering, so no manual-only gap remains beyond a final visual sanity check.

## Out of Scope

- Any audio playback/preview (see Implementation Decisions).
- Renaming/labeling sfx slots for display — depends on Sfx tab conventions not yet designed.
- Pattern reordering, insertion, or deletion — `CartData.music` is a fixed-length 64-entry array; this tab only edits values in place, it doesn't restructure the array.
- Any "currently playing pattern" highlighting — meaningless without playback.

## Further Notes

Two judgment calls flagged for review:
1. Replacing PICO-8's click-to-increment sfx selection with a direct number input is a deliberate UX improvement (matches the "not restricted by the native UI" long-term goal even though this PRD is framed as parity-first) — flag if you'd rather match the native interaction exactly for this first pass.
2. Toggling a channel off preserves its last `sfxId` instead of clearing it to 0 — chosen to avoid data loss on accidental clicks; PICO-8's own behavior here wasn't confirmed from available sources and may differ.

Sources consulted: [PICO-8 Wiki — Music](https://pico-8.fandom.com/wiki/Music), [Nerdy Teachers — Getting Started with Sound and Music](https://nerdyteachers.com/PICO-8/Music/GettingStarted/), [PICO-8 Manual](https://www.lexaloffle.com/dl/docs/pico-8_manual.html), [Lexaloffle forum — Data structures for sfx and music](https://www.lexaloffle.com/bbs/?tid=2341) (already cited in `docs/spec.md` §9). Direct fetch of the wiki page for finer UI detail (pattern-list layout, playback highlighting) failed (HTTP 402 from the fetch tool) — the description above is reconstructed from search-result summaries of that page plus the tutorial sources, not a full read of the wiki article itself; worth a manual PICO-8 check before implementing if precise fidelity to the native layout matters.

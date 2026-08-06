---
title: "React app: Code tab (Lua source editor)"
description: "Replicate PICO-8's built-in code editor — multi-tab Lua source split on the `-->8` marker, live character/compressed-size limit indicators, comment-toggle/duplicate-line/find shortcuts — as the app's Code screen."
status: needs-triage
---

## Problem Statement

`CartData.lua` (`internal/pico8/cart-data.ts`) is a single decompressed Lua source string, already including PICO-8's two leading `--` title/byline comment lines (`docs/spec.md` §5). There is no UI for viewing or editing it yet. PICO-8's own code editor isn't a plain text box: it splits one Lua source into up to 8 navigable "tabs" via a plain-text `-->8` marker convention, and continuously shows the author how close they are to the compressed-size ceiling that `encodeLua` (`internal/pico8/cart-lua-encode.ts`) enforces — both are real constraints a naive `<textarea>` would hide until save time.

## Solution

Add `app/code/CodeTab.tsx`, reading/writing `CartContext.cart.lua` (established by PRD 18). Two things distinguish this from a generic code box, both confirmed by decoding real fixtures in `cart/` with the existing CLI (`cab ride.p8.png`, `golf sunday.p8.png`, `trial of the sorcerer.p8.png` all contain literal lines reading exactly `-->8`, six/five/seven times respectively — `slipways.p8.png`/`dark tomb.p8.png` have none, i.e. single-tab carts):

- **Tab splitting**: the single `lua` string is split into segments on lines matching exactly `-->8` (no trailing content on that line, per every observed real-fixture occurrence). Each segment is shown as one PICO-8-style tab in a horizontal tab strip above the editor; switching tabs swaps the visible text but all tabs share one underlying string, rejoined with `-->8\n` lines on every edit (not just on save) so `CartContext.updateCart({ lua })` always holds the full, current, single source string other tools (Download) already expect. Adding/removing a tab is a "+"/"×" UI affordance that inserts/removes a `-->8` boundary; PICO-8's real 8-tab cap is enforced with a disabled "+" button past 8 segments.
- **Limit indicators**: a status line below the editor shows character count (`lua.length`) and compressed size (`encodeLua(lua).length`, computed on an idle debounce since it's not free), against the real enforced ceilings already implemented in the library — `decompressedLength <= 0xffff` and `MAX_COMPRESSED_LENGTH = 15608` bytes in `internal/pico8/cart-lua-encode.ts` (note: `docs/spec.md` §4's prose figure of "under 15,360 bytes" is superseded by the library's own corrected, verified structural ceiling of 15,608 — PRD 12's Further Notes documents why). The indicator turns into a visible warning once compressed size is within some margin of the ceiling (exact threshold is this PRD's judgment call, not researched — 90% is a reasonable default), rather than PICO-8's own right-click-to-cycle-through-one-stat-at-a-time approach (showing both at once needs no interaction and fits a normal-width modern layout, which is the entire point of not being boxed into 128×128).

## User Stories

1. As a user editing a cart's Lua code, I want it split into the same tabs PICO-8's own editor would show, so that multi-file-feeling carts stay organized the way their author intended.
2. As a user approaching the compressed-size limit, I want to see that clearly while typing, not discover it as a thrown error when I hit Download, so that I can trim code before losing work to a failed export.
3. As a user duplicating/reordering/commenting out code, I want the same shortcuts PICO-8 offers (duplicate line, move line up/down, toggle line comment, undo/redo, find), so that muscle memory transfers.
4. As a user who pastes in a character PICO-8 can't actually store (anything outside the single-byte range `encodeLua` truncates via `& 0xff`), I want a visible warning at that character's position, so silently-corrupted output isn't a surprise after export.

## Implementation Decisions

- **Editor widget: plain `<textarea>` + synced-overlay syntax highlighting, not a third-party editor component (e.g. CodeMirror).** This is the one real trade-off in this PRD. A `<textarea>` gets native browser undo/redo, IME/paste handling, and zero new dependencies — directly matching the repeatedly-stated "least dependency" instruction (only `react`/`react-router`/the UI-kit primitives were pre-approved as new deps; a code-editor package wasn't). The standard "highlight-within-textarea" pattern (a `<pre>` layer behind a transparent-text `<textarea>`, identical font metrics, scroll-synced) gives Lua keyword/string/comment/number coloring with a small hand-written regex tokenizer, no lexer dependency. The cost: no minimap, no built-in line-wrap-aware column gutter, and worse large-file perf than a virtualized editor component — acceptable given no real fixture's Lua source is more than tens of KB of text. Flagged for review since "acceptable" is my judgment call, not yours.
- **Line numbers**: shown per-tab-segment (restarting at 1 per PICO-8 tab, matching how PICO-8 itself displays position "within the current tab"). This is additive beyond PICO-8's native UI (confirmed via the official manual excerpt: the status bar shows position and one cyclable stat, not a persistent gutter) but doesn't conflict with capability parity, so it's kept as a low-risk modernization rather than treated as an open question.
- **Shortcuts implemented**: Ctrl/Cmd+Z / +Shift+Z (or +Y) undo/redo (native `<textarea>` behavior, no extra code), Ctrl/Cmd+D duplicate line, Ctrl/Cmd+/ or Ctrl/Cmd+B toggle `--` line-comment on the selection (PICO-8 itself uses Ctrl+B per the official manual; Ctrl+/ is added as the more广-recognized modern convention alongside it, not instead of it), Ctrl/Cmd+F opens an in-page find bar (browser-native `Ctrl+F` is intercepted since this isn't a real multi-page document — matches PICO-8 needing its own find since it isn't a browser-rendered text document either), Alt+↑/↓ jump to previous/next top-level function (`function`/`local function` line, regex-matched — not real Lua parsing), Ctrl+Tab / Ctrl+Shift+Tab cycle tabs. Ctrl+1/Ctrl+2 (move line up/down), Ctrl+G (repeat find), and Ctrl+U (keyword help lookup) are noted as researched-but-deferred — see Out of Scope.
- **Byte-range validation**: on every change, scan for characters outside `0x00`-`0xFF` (anything `charCodeAt(i) > 255`) and underline/highlight them in the overlay layer with a tooltip explaining they'll be truncated to a different byte on export — surfaces a gap that already existed silently in `encodeLua`'s `& 0xff` truncation, without changing that function's behavior.
- Depends on PRD 18 (app shell, `CartContext`, folder conventions) and PRD 16 (repo restructure — imports become `internal/pico8/cart-lua-encode.ts` etc.) landing first.

## Testing Decisions

- No automated test suite for `app/` yet, consistent with PRD 18's deferral of that tooling decision.
- Manual verification: load `cab ride.p8.png` (6 real `-->8` markers) and confirm the tab strip shows 7 segments in the right order with the right content; edit text near the compressed-size ceiling using a large fixture's Lua (`the lost night.p8.png` compresses to 15,534 of 15,608 bytes per PRD 12's Further Notes) and confirm the warning state activates; paste a multi-byte Unicode character and confirm it's flagged.

## Out of Scope

- A real Lua tokenizer for exact token-count parity with PICO-8's right-click-cyclable "tokens" stat — approximating PICO-8's token-counting rules correctly is nontrivial (it's not simply `text.length` or whitespace-split word count) and not needed to unblock editing; only character count and compressed size ship in this PRD. Flagged as a known, deliberate gap versus true PICO-8 parity, not an oversight.
- Ctrl+1/Ctrl+2 move-line-up/down, Ctrl+G repeat-find, Ctrl+U keyword documentation lookup, and the puny-font/Hiragana/Katakana input-mode toggles (Ctrl+P/J/K) — real PICO-8 features found during research, deliberately deferred as lower-value than the rest of this list for a first pass; not needed for the app to be usable.
- Any actual Lua linting, autocomplete, or PICO-8 API awareness (`spr()`, `btn()`, etc.) — PICO-8's own editor has minimal-to-none of this either (confirmed: no evidence of real autocomplete beyond the `shift+enter`-inserts-`end` code-block-closing shortcut, which also isn't implemented here).
- Running/testing the code in any way — this app never executes Lua (established in PRD 18).

## Further Notes

Two research findings worth flagging explicitly since they weren't obvious going in and affect other PRDs' assumptions:
1. **`-->8` is literal text, not a special binary marker.** It was hypothesized this might be a form-feed (`\x0c`) byte the .p8.png binary format uses internally, mirroring how the plain-text `.p8` format is known to render tab breaks — but grepping decoded real fixtures shows `-->8` appears as an ordinary 4-character line in the decompressed Lua string itself (verified via `node --import tsx src/cli.ts decode` against `cart/cab ride.p8.png` etc.). No library change is needed to support this — it's purely a Code-tab-level parsing/display convention.
2. **`docs/spec.md` §4's "under 15,360 bytes" is stale.** The actual enforced ceiling, per `internal/pico8/cart-lua-encode.ts`'s `MAX_COMPRESSED_LENGTH` and PRD 12's Further Notes, is 15,608 bytes (`0x4300`-`0x7fff` minus the 8-byte header). This PRD's limit indicator uses 15,608; worth a small follow-up to correct the spec doc's prose separately, since it's a pre-existing inaccuracy, not something this PRD introduces.

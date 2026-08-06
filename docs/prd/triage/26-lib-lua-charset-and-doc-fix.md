---
title: "lua: reject out-of-range characters instead of silently truncating; fix stale spec.md limit"
description: "encodeLua currently masks any character code above 0xFF into an arbitrary different byte with `& 0xff`, silently corrupting the source. Make it throw instead. Also correct docs/spec.md §4's stale '15,360 bytes' prose to the real, already-implemented 15,608-byte ceiling."
status: needs-triage
---

## Problem Statement

`encodeLua` (`cart-lua-encode.ts`) builds its byte array via `text.charCodeAt(i) & 0xff` — any character outside `0x00-0xFF` (e.g. a pasted curly quote, an emoji, any non-Latin1 character) silently becomes a different, wrong byte with no error or warning. Discovered while researching the React Code tab (PRD 22). Separately, `docs/spec.md` §4 still says "compressed Lua code must be under 15,360 bytes" — PRD 12's own Further Notes already documents that this figure was wrong and corrected `MAX_COMPRESSED_LENGTH` in code to the real structural ceiling, 15,608 bytes, but never updated this line of prose.

## Solution

- `encodeLua` validates every character code is in `0x00-0xFF` before compressing; on the first out-of-range character, throws a descriptive error naming the character and its position (index) in the source string.
- `docs/spec.md` §4's limit line is corrected from "under 15,360 bytes" to "under 15,608 bytes", matching the code and PRD 12's already-documented finding.

## User Stories

1. As a developer whose Lua source has a stray non-Latin1 character (commonly from copy-pasting text with smart quotes/em-dashes), I want a clear error naming the character and where it is, so that I can fix it instead of shipping a silently-corrupted cart.
2. As a developer reading `docs/spec.md`, I want the stated compressed-size limit to match what the code actually enforces, so the spec isn't misleading.

## Implementation Decisions

- Validation loop runs before `compress()` is called, so the error is thrown before any compression work happens on invalid input.
- Error message includes the character (or its code point) and its 0-based index in `text`, consistent with this file's existing `assert.ok` messages (e.g. the compressed-length and decompressed-length checks already present).

## Testing Decisions

- New unit test in `cart-lua-encode.test.ts`: `encodeLua` throws when given a string containing a character with code point > 255 (e.g. `"é"` or a smart quote).
- Existing fixture-based round-trip tests are unaffected — no real fixture's Lua source contains such characters.

## Out of Scope

- Any Unicode/UTF-8 support for Lua source — PICO-8 itself doesn't support it either; rejecting is the correct behavior, not a stepping stone to supporting it.
- Any change to `decodeLua` (decoding already produces whatever byte was stored; this PRD only closes the silent-corruption gap on the encode/write path).

## Further Notes

The `docs/spec.md` fix is a one-line factual correction (already effectively pre-approved by PRD 12's Further Notes documenting the real number) — bundled into this PRD rather than filed separately since it's in the same area of code/docs.

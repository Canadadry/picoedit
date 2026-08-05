---
title: "Level 2 integration test: bit-exact section recompression"
description: "Prove spec §7's Level 2 criterion: decoding cart bytes into sections and recompressing them reproduces the original 32KB cart data bit-for-bit."
status: done
---

## Problem Statement

Level 1 (pixel round-trip) has been established since step 01 and kept green through every PRD since, but spec §7 also requires a second, stricter check: cart data decoded into sections then recompressed must be bit-identical to the original cart data — not just "loads correctly." This is trivial for the fixed-layout sections (gff/gfx/map/sfx/music) but depends entirely on step 12's Lua bit-exact work for the Lua section.

## Solution

Add the explicit test spec §7 describes: for each real fixture, extract `CartBytes` (via step 01's `decode`), decode into per-section values, re-encode each section, reassemble, and assert the reassembled `CartBytes` is bit-identical to the original.

## User Stories

1. As a developer verifying the toolkit's correctness end-to-end, I want a single test that directly mirrors spec §7's stated Level 2 description, so that "does this project actually meet its own spec" has one clear, authoritative answer.
2. As a developer investigating a Level 2 failure, I want the test to report which section's bytes first diverged, so that I know whether it's the (expected, if step 12 hasn't fully landed) Lua section or a genuine regression in an otherwise-solved section.

## Implementation Decisions

- This test composes steps 04-12's per-section decode/encode functions directly (not through the top-level `decode`/`encode` pair), since it operates purely at the `CartBytes ⟷ sections ⟷ CartBytes'` layer per spec §7's own diagram, with no PNG/pixel involvement.
- Failure reporting compares section-by-section (gff, gfx, map, sfx, music, lua) rather than a single opaque whole-buffer diff, to make it immediately clear whether a failure is the known Lua risk or an unexpected regression elsewhere.

## Testing Decisions

- For each real fixture: decode `CartBytes` into gff/gfx/map/sfx/music/lua, re-encode each, reassemble into `CartBytes'`, assert bit-identical to the original per-section (allowing this test to clearly report a Lua-only known gap rather than a hard pass/fail on the whole buffer).

## Out of Scope

- Fixing any Lua bit-exactness gap this test surfaces — that's step 12's job; this step only proves/reports the criterion.

## Further Notes

If step 12 hasn't achieved full bit-exactness by the time this step is reached, this test should still land — documenting the known Lua gap explicitly (e.g. a skipped/expected-fail assertion with a comment referencing step 12) is more honest than not writing the test at all.

---
title: "Lua compression (bit-exact): match PICO-8's reference compressor"
description: "Refine the MTF/unary encoder to reproduce PICO-8's own reference compressor's output byte-for-byte on real fixtures, closing spec §7's Level 2 bit-exact success criterion for the Lua section."
status: needs-triage
---

## Problem Statement

Spec §7 states the overall success criterion is bit-exact cart data after decode→recompress. For every other section this is a trivial consequence of a fixed 1:1 binary layout. For Lua, it requires the encoder's match-selection heuristics to agree exactly with PICO-8's own reference compressor (`pxa_compress_snippets.c`) on real source input — a genuinely open-ended reverse-engineering problem, not a mechanical translation of the spec's decode algorithm.

## Solution

Study the reference C source (and the Roberto Vaccari write-up, both cited in spec §9) closely enough to replicate its exact greedy/tie-breaking match-selection behavior, and verify byte-for-byte equality against real fixtures' actual compressed Lua bytes.

## User Stories

1. As a developer compacting an *unmodified* cart (no Lua edits), I want the recompressed bytes to be bit-identical to the original, so that spec §7's Level 2 test passes for real fixtures.
2. As a developer investigating a fixture where bit-exact matching fails, I want a clear diff of where the encoder's output first diverges from PICO-8's, so that I can iterate on the matching heuristic rather than guessing blindly.

## Implementation Decisions

- Exact match-selection algorithm TBD — this PRD is explicitly scoped to *investigate and implement* against the reference C source, not to a heuristic decided in advance. Expect this step to be re-scoped or split further once the reference algorithm's actual behavior is understood in detail (flagged as a real risk during design discussion, not a normal implementation step).
- If full bit-exact matching proves infeasible within a reasonable scope, the fallback (to confirm with the user at that point, not decided now) is likely: keep step 11's functionally-correct encoder as the shipped behavior, and document the Level 2 bit-exact criterion as met only for the non-Lua sections.
- Once this step lands, `decode(pngBytes): CartData` / `encode(data: CartData, originalPngBytes: Uint8Array): Uint8Array` have reached their final shape — every field of `CartData` is now real, decoded, and bit-exactly re-encodable.

## Testing Decisions

- For each real fixture with recent-format Lua, `encodeLua(decodeLua(originalCompressedBytes))` is bit-exact against `originalCompressedBytes`.
- Any fixture where exactness isn't yet achieved should fail loudly and specifically (not be silently skipped), so regressions and partial progress are both visible.
- Step 01's Level 1 pixel round-trip test must still pass unmodified.

## Out of Scope

Nothing pre-emptively — scope is explicitly open given the research uncertainty flagged above.

## Further Notes

This is the highest-risk step in the whole cut. Sequenced last among the section steps deliberately so its uncertainty/timeline doesn't block anything else. May need to be split into further sub-steps once the reference algorithm is better understood — expect to revisit this PRD's scope rather than treat it as final.

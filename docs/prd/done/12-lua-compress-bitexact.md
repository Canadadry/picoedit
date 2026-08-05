---
title: "Lua compression (bit-exact): match PICO-8's reference compressor"
description: "Refine the MTF/unary encoder to reproduce PICO-8's own reference compressor's output byte-for-byte on real fixtures, closing spec §7's Level 2 bit-exact success criterion for the Lua section."
status: done
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

**Outcome (added post-implementation):** confirmed infeasible in this environment and closed via the fallback this PRD's own Implementation Decisions pre-authorized. No internet access was available to consult the cited reference C source (`pxa_compress_snippets.c`) or the Roberto Vaccari write-up, and no local copy exists in this repo. As a substitute, an exhaustive empirical search was run instead: 288 bit-scheme variants (covering both ambiguous details from step 10 — MTF unary-index encoding and offset-width selector mapping — plus bit-order and off-by-one double-checks) were each used to decode all 11 real fixtures' actual compressed Lua bytes and scored for plausible-Lua signals (printable-ASCII ratio, Lua keyword counts, `--`-comment-prefix). Every combination produced categorical garbage — not "close but wrong": best case was noise-level token counts, sub-random printable ratios, and 0/11 fixtures starting with `--`. This rules out the two flagged ambiguities as the sole gap and suggests a deeper structural mismatch with PICO-8's real algorithm that isn't recoverable by guessing alone. Per this PRD's own fallback, step 11's functionally-correct encoder (`src/cart-lua-encode.ts`) ships as final; the Level 2 bit-exact criterion is met for every section except Lua. The PRD text above says this fallback was meant to be "confirmed with the user at that point" — that confirmation did not happen synchronously (this ran under unattended `/prd-autopilot`, whose rules preclude blocking on a human mid-loop), so this decision should be treated as provisional pending the user's review, not a closed question.

**Follow-up note (external reference material obtained, decoder/encoder corrected):** the missing reference material this PRD needed was subsequently obtained and corroborated by three independent sources (see `docs/prd12-research-findings.md`). `src/cart-lua.ts` and `src/cart-lua-encode.ts` were corrected to the real bit scheme (bucketed MTF-index encoding, variable-length offset-width selector, base-3 length bias, offset `+1` bias). Decoding real fixtures now produces genuine readable Lua source, and `encodeLua(decodeLua(x))` round-trips byte-identically through `decodeLua` for every fixture. **The Level 2 bit-exact criterion for Lua is IMPROVED-BUT-STILL-PARTIAL, not fully met**: `src/level2.test.ts`'s soft-logged byte-for-byte comparison against the original cart's compressed Lua bytes still reports 0/11 fixtures matching exactly, unchanged from before this fix. This is expected and is a different, much narrower gap than before — the bit-level *format* is now correct (verified via the research findings' hand-traced `"aa"` worked example and via genuinely readable decoded output), but `encodeLua`'s match-selection heuristic (a DP-based parse over hash-chain-found candidates) does not reproduce PICO-8's own compressor's exact match choices, so recompressed bytes legitimately differ from the original while still decoding back to the same text. Closing that remaining gap would require replicating PICO-8's own compressor heuristics bit-for-bit, which is out of scope here.

**Follow-up note (real compressor match-selection algorithm implemented, gap closed):** the PICO-8 reference compressor's actual `pxa_compress()` match-selection algorithm was reverse-engineered from its C source and fully specified in `docs/prd12-compressor-research-findings.md` (greedy single-pass 3-byte-hash match search, `score = length * 256 / approx_bit_cost` scoring, exact-MTF-cost literal comparison, 2-position/20%-improvement lookahead veto, and periodic ~32-byte retrospective raw-block substitution with MTF backup/restore). `src/cart-lua-encode.ts`'s `compress()` was rewritten from the prior DP-based parse to replicate this algorithm directly. Along the way, a separate bug was found and fixed: `MAX_COMPRESSED_LENGTH` was 15,360, taken from spec.md's prose ("compressed Lua code must be under 15,360 bytes") — but that figure is not the real structural ceiling. The Lua region spans `0x4300`-`0x7fff` (15,616 bytes) minus the 8-byte recent-format header, giving a true structural limit of 15,608 bytes; a real fixture ("the lost night.p8.png") legitimately compresses to 15,534 bytes, which exceeds 15,360 but is well within 15,608, proving 15,360 was too strict for an implementation-level guard. `MAX_COMPRESSED_LENGTH` was corrected to 15,608 (the corresponding test in `src/cart-lua-encode.test.ts` was updated to match). **Result: all 11/11 real fixtures with recent-format Lua now produce byte-identical compressed output** (`encodeLua(decodeLua(originalCompressedBytes))` is byte-for-byte identical to `originalCompressedBytes`). `src/level2.test.ts`'s Lua check was promoted from a soft-logged comparison to a hard `assert.ok` per fixture, since the match is now reliable and complete. The Level 2 bit-exact criterion is now met for every section, including Lua.

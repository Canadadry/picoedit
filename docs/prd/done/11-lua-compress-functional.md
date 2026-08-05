---
title: "Lua compression (functional): MTF/unary encoder"
description: "Implement an MTF/unary encoder producing a valid, decodable compressed stream under the 15,360-byte limit — correctness measured by round-tripping through step 10's decoder, not yet by matching PICO-8's exact output."
status: done
---

## Problem Statement

Compaction needs to turn edited Lua source text back into a compressed byte stream PICO-8 can load. Nothing produces one yet. Byte-exact matching of PICO-8's own reference compressor (spec §7's stated Level 2 success criterion) is a much harder, separate goal — isolated to step 12 per an earlier scoping decision, since it's the single riskiest piece of the whole spec and shouldn't block everything else.

## Solution

Implement `encodeLua(text: string): Uint8Array`, a greedy (or otherwise straightforward) MTF/unary encoder whose only correctness bar for this step is: `decodeLua(detectLuaFormat(encodeLua(text))) === text`, and the output fits under 15,360 bytes for realistic Lua source.

## User Stories

1. As a developer compacting a cart with edited Lua source, I want it compressed into a stream PICO-8 can decode, even if the exact bytes differ from what PICO-8's own compressor would have produced.
2. As a developer compacting a cart whose edited Lua no longer fits under 15,360 compressed bytes, I want a clear error telling me the size limit was exceeded, so I know to shorten the source rather than getting a corrupt cart.
3. As a developer verifying the encoder, I want `decodeLua(encodeLua(text)) === text` to hold for a range of real fixture carts' actual Lua source, so that the encoder is proven against real-world code, not just short synthetic strings.

## Implementation Decisions

- No requirement to match PICO-8's own compressor's exact match-selection heuristics in this step — any correct, decodable encoding is acceptable, e.g. a straightforward greedy longest-match search is fine.
- Throws a descriptive error if the compressed output would exceed 15,360 bytes, rather than silently truncating or producing an unloadable cart.
- `encode`'s Lua re-compression, wired up in step 10, now actually round-trips correctly for the first time (functionally, not yet bit-exactly).

## Testing Decisions

- Round-trip test: for each real fixture, `decodeLua(detectLuaFormat(encodeLua(originalDecodedText))) === originalDecodedText`.
- Size test: for at least one large real fixture, assert the encoded output is under 15,360 bytes.
- Unit test: a short hand-crafted string encodes and decodes back to itself, isolating the encoder from fixture-dependent noise.
- Step 01's Level 1 pixel round-trip test must still pass unmodified.

## Out of Scope

- Matching PICO-8's exact compressed byte output — step 12.
- Any attempt to optimize compression ratio beyond "fits under the limit."

## Further Notes

Deliberately the easier half of "make Lua compression work" — get correctness first, exactness second.

**Follow-up note (bit scheme corrected):** `encodeLua` mirrored the same guessed bit scheme as PRD 10's decoder (Elias-gamma-style MTF index, fixed-2-bit offset-width selector), which was later confirmed wrong (see `docs/prd12-research-findings.md` and PRD 10's follow-up note). `writeMtfIndex`, `writeOffsetWidth`, and the offset/length encoding in `src/cart-lua-encode.ts` were corrected to match the real bucketed MTF-index scheme and variable-length offset-width selector, mirroring the corrected decoder.

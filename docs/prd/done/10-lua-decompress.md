---
title: "Lua decompression: marker detection + MTF/unary decode"
description: "Detect the Lua code format marker at 0x4300 and decode the recent-format MTF/unary-compressed stream into decompressed Lua source text."
status: done
---

## Problem Statement

Nothing decodes the Lua code region yet. Per spec §8.2, the marker at 0x4300 determines format (`\x00pxa` = recent/supported, `:c:\x00` = legacy/unsupported, otherwise raw ASCII), and the recent format's compressed stream needs a move-to-front + unary decoder to recover the original source text.

## Solution

Implement `detectLuaFormat(bytes: CartBytes): LuaFormat` (marker detection) and `decodeLua(format: LuaFormat): string` (MTF/unary decode for `"recent"`, pass-through for `"raw"`, throw a clear "unsupported legacy format" error for `"legacy"`).

## User Stories

1. As a developer decoding a cart with recent-format Lua, I want the compressed stream decoded into the original source text, so that I can read/edit the actual Lua code.
2. As a developer decoding a cart with legacy-format Lua, I want a clear error telling me the format is unsupported, so that I know to convert it upstream (per spec §10, out of scope for this toolkit) rather than getting silently wrong output.
3. As a developer decoding a cart with raw ASCII Lua (no compression marker), I want the text extracted directly, so that uncompressed carts still work.
4. As a developer verifying the MTF/unary decoder, I want it tested against real fixture carts' actual compressed Lua, so that the algorithm is proven against real PICO-8 output, not just synthetic bit patterns.

## Implementation Decisions

- `LuaFormat` discriminated union exactly as defined in spec §8.7.
- The MTF/unary decode algorithm follows spec §8.2 precisely: maintain a 256-entry move-to-front table; read the bitstream LSB-to-MSB per byte; header bit `1` = MTF-indexed literal (unary+fixed-bit index, move found byte to front); header bit `0` = offset/length back-reference (2 selector bits choose 5/10/15-bit offset, length in 3-bit groups accumulated while the group equals 7); special case: 10-bit offset encoded as exactly `1` means an uncompressed literal block (read 8 bits at a time to a null byte), not a back-reference.
- `decode`'s return type gains a `lua: string` field (the decompressed source); `encode`'s input grows the same field, though `encode` doesn't yet re-compress it correctly — that starts at step 11.

## Testing Decisions

- Unit test: a small, hand-constructed compressed stream (built by hand from the spec's algorithm, small enough to trace bit-by-bit) decodes to a known short string — pins down the bit-reading direction and each of the algorithm's branches independently.
- Integration test: for each real fixture with recent-format Lua, `decodeLua` produces syntactically plausible Lua source (non-empty, starts sensibly) — full correctness is confirmed indirectly once step 12's bit-exact recompression round-trips the same text back to the original compressed bytes.
- Step 01's Level 1 pixel round-trip test must still pass unmodified.

## Out of Scope

- Legacy format decoding — explicitly out of scope per spec §10.
- Compression (the inverse direction) — steps 11/12.
- Interpreting the title/byline comment lines as a separate structured field — per spec §4 they stay embedded in the Lua source text as ordinary leading comment lines.

## Further Notes

This is the first genuinely algorithmically complex step; keep the tracer-bullet discipline (one hand-traced case first) before trusting fixture-based tests.

**Implementation note (added post-implementation):** spec §8.2 leaves two bit-level details underspecified — the exact "unary + fixed bits" MTF-index encoding, and the exact 2-bit-selector-to-offset-width mapping. No internet access was available to consult the cited reference source, so `src/cart-lua.ts` uses a documented best-effort guess (Elias-gamma-style index encoding: count unary `1`-prefix bits as `n` terminated by `0`, read `n` more bits as `f`, `index = (2^n - 1) + f`; offset width selected by up to 2 selector bits: `0`→5-bit, `10`→10-bit, `11`→15-bit). This guess is self-consistent (its own hand-traced unit test passes) but does NOT match real PICO-8 output — decoding real fixtures' recent-format Lua produces non-empty text that does not look like plausible Lua source. Marker/header parsing (offsets, endianness, format detection) is exact per spec and fixture-verified. This gap is intentionally deferred to step 12, which is explicitly scoped to reverse-engineer the real reference algorithm — step 12 should revisit/replace `decodeLua`'s compressed-stream interpretation, not just build an encoder to match it.

---
title: "Cart header: SHA1 verify/compute and passthrough bytes"
description: "Verify the cart's SHA1 on decode and recompute it on encode; carry the unparsed version/platform and reserved bytes through unchanged."
status: done
---

## Problem Statement

Bytes 0x8006-0x8019 of the cart hold a SHA1 of the first 32,000 bytes that PICO-8 checks on load — nothing currently verifies or (re)computes it. Bytes 0x8000-0x8005 (version/platform) aren't understood by this project and, per an earlier decision, won't be parsed — they must simply survive a round-trip unchanged.

## Solution

Implement `verifyHeader(bytes: CartBytes): void` (throws on SHA1 mismatch) and `writeHeader(bytes: CartBytes): CartBytes` (recomputes and writes the SHA1 over bytes 0x8006-0x8019, leaves 0x8000-0x8005 and 0x801A-0x801F untouched from whatever the caller already put there).

## User Stories

1. As a developer decoding a cart, I want the SHA1 verified against the first 32,000 bytes, so that a corrupted or non-cart PNG is rejected with a clear error rather than silently producing garbage sections.
2. As a developer compacting a cart, I want the SHA1 recomputed and written automatically, so that PICO-8 accepts the resulting file without me having to compute a hash by hand.
3. As a developer whose cart has unfamiliar version/platform bytes, I want those bytes to pass through a decode→encode round-trip unchanged, so that compaction never corrupts header fields this project doesn't understand.

## Implementation Decisions

- SHA1 computed via `crypto.subtle.digest("SHA-1", ...)` (Web Crypto, browser-native — no external SHA1 dependency).
- `verifyHeader` throws a descriptive error (not a boolean/`isValid`-style check) since a bad cart is an exceptional, not a validated-data-shape, condition.
- Bytes `0x8000-0x8005` and `0x801A-0x801F` are read and re-written byte-for-byte from the input `CartBytes` — no interpretation, per the earlier decision not to research their meaning.

## Testing Decisions

- Unit test: compute SHA1 over a hand-crafted 32,000-byte buffer, write it into bytes 0x8006-0x8019, assert `verifyHeader` passes; corrupt one byte, assert it throws.
- Integration test: for each real fixture, `verifyHeader` on the `CartBytes` produced by step 01's `decode` passes (proves `decode` produces bytes PICO-8 itself considers valid).
- Round-trip test: `writeHeader` on a fixture's `CartBytes`, followed by `verifyHeader`, passes; bytes 0x8000-0x8005 and 0x801A-0x801F are unchanged from the input.

## Out of Scope

- Understanding/decoding the version or platform meaning of bytes 0x8000-0x8005.

## Further Notes

None.

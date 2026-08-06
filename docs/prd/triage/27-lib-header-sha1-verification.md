---
title: "lib: wire up header SHA1 verification/re-signing in decode()/encode()"
description: "decode() silently accepts a cart whose header SHA1 doesn't match its contents, and encode() never recomputes that SHA1 after an edit — wire both existing-but-unused functions into the real call path with a synchronous SHA1 implementation."
status: needs-triage
---

## Problem Statement

As a user of `cli decode` or the app's File tab, when I load a cart whose header integrity checksum doesn't match its actual contents (a corrupted download, a hand-edited file, a bad transfer), I expect to be told the cart looks corrupted — not have it silently load as if nothing were wrong. Today, `decode()` (`src/internal/pico8/cart.ts`) never calls the checksum-verification function at all, even though that function (`verifyHeader()`, `src/internal/pico8/cart-header.ts`) already exists, is fully implemented, and has its own passing unit test in isolation — it's just never wired into the actual decode path. Both `cli decode` and the React app's File tab (PRD 18) call this same `decode()`, so both are silently exposed.

Digging further surfaced a second, related gap: `encode()` never calls the matching `writeHeader()` function either, so after any edit (sprite, map, sfx, music, gff, or Lua — every one of those sections falls inside the SHA1-hashed byte range), the exported cart keeps its *original* stored checksum, which no longer matches the *edited* contents. If this PRD fixed verification without also fixing re-signing, every legitimately-edited-and-saved cart would immediately fail its own next `decode()` — a self-inflicted regression. Both halves ship together.

As a user who edits a cart and downloads it, I expect to be able to load that same file back in without it being flagged as corrupted just because I changed something.

## Solution

Wire `verifyHeader()` into `decode()`'s call path (checked right after extracting the raw cart bytes, before parsing any section, so a corrupted cart fails fast) and `writeHeader()` into `encode()`'s call path (as the final step, so every exported cart carries a freshly computed, correct checksum over its actual contents).

`verifyHeader()`'s existing behavior is unchanged: a cart whose stored checksum is all-zero (unset) is treated as unverified, not a mismatch — this is deliberately preserved, not touched by this PRD.

The one implementation wrinkle: `verifyHeader()`/`writeHeader()` are currently `async` because they use the Web Crypto API's `crypto.subtle.digest`, which has no synchronous form — but `decode()`/`encode()` are both fully synchronous today, and every caller (the CLI, the React app's `FileTab`, and every existing test) depends on that. Rather than making `decode()`/`encode()` async (which would ripple into every caller), this PRD replaces the SHA1 computation itself with a small, dependency-free, synchronous SHA1 implementation, so `verifyHeader()` and `writeHeader()` become ordinary synchronous functions and `decode()`/`encode()`'s signatures don't change at all.

## User Stories

1. As a user dropping a `.p8.png` onto the File tab, I want to be told the file looks corrupted if its header checksum doesn't match its contents, so that I'm not silently working with garbage data.
2. As a user running `cli decode` on a corrupted cart, I want the command to fail loudly with a clear error, so that a bad file doesn't produce misleading output that looks successful.
3. As a user who edits a cart's sprites/map/sfx/music/gff/code and downloads the result, I want the downloaded file to load back in without a false corruption warning, so that editing and re-saving is a reliable round trip.
4. As a user opening an older or hand-crafted cart whose header checksum was never set (all-zero), I want it to load normally without being flagged as corrupted, so that this stricter check doesn't break carts that were always valid under PICO-8's own looser rules.
5. As a developer maintaining the SHA1 logic, I want the hashing algorithm itself unit-tested against known standard test vectors independent of any cart file, so that a bug in the algorithm is caught immediately rather than surfacing later as a mysterious cart-decode failure.
6. As a developer running the project's existing fixture-based Level 2 integration tests, I want every real fixture in `cart/` to keep passing unchanged after this fix, so that I have confidence real, legitimately-saved PICO-8 carts all carry correct checksums already and aren't newly, incorrectly rejected.
7. As a developer running the existing `cart-malformed.test.ts` suite, I want its direct `verifyHeader()` test updated to match the function's new synchronous signature, so the test suite doesn't break on an API shape change that's incidental to this fix's actual purpose.
8. As a user of the File tab who previously saw a generic decode error for a SHA1-mismatched cart (before this PRD, that specific fixture silently succeeded instead), I want the same inline-error UI already built in PRD 18 to now correctly cover this failure case too, without needing new UI work.

## Implementation Decisions

- `cart-header.ts`'s internal SHA1 computation switches from `crypto.subtle.digest` (Web Crypto, async-only) to a small, hand-written, dependency-free, synchronous SHA1 implementation operating on a `Uint8Array` and returning a 20-byte `Uint8Array` digest — standard, well-known algorithm, no new npm dependency (consistent with this project's existing "least dependency" direction).
- `verifyHeader()` and `writeHeader()` (`cart-header.ts`) both drop `async`/`Promise`/`await` and become plain synchronous functions. Their names, parameter shapes, and behavior (including the existing all-zero-checksum-means-unverified rule) are otherwise unchanged.
- `decode()` (`cart.ts`) calls `verifyHeader(bytes)` synchronously immediately after extracting the raw cart bytes and before decoding any section (gff/gfx/lua/map/music/sfx/label) — a corrupted cart is rejected before any partial parsing work happens.
- `encode()` (`cart.ts`) calls `writeHeader(bytes)` synchronously as its last step before compositing the result back into the PNG pixel grid, so the returned bytes always carry a checksum matching their actual (possibly just-edited) contents.
- No signature changes to `decode()`/`encode()` themselves — both remain synchronous with the same parameters and return types. No caller (CLI's `decodeCommand`/`encodeCommand`, the React app's `FileTab`) needs to change its calling convention; `FileTab`'s existing try/catch-and-show-inline-error handling (from PRD 18) automatically covers the new failure mode with no new UI code.
- Existing direct callers of `verifyHeader()` in tests (`cart-malformed.test.ts`) update from `await assert.rejects(() => verifyHeader(...), ...)` to synchronous `assert.throws(() => verifyHeader(...), ...)`, matching the new signature.

## Testing Decisions

- New unit tests for the synchronous SHA1 implementation itself, against known standard test vectors independent of any cart file (e.g. the SHA1 of the empty string and of `"abc"` are well-documented, fixed values) — pure algorithmic correctness, testable in isolation, following this project's existing preference for testing genuinely non-trivial logic directly (`docs/spec.md` §7).
- `cart-malformed.test.ts` gets a new test asserting `decode()` (the `cart.ts` one, not `cart-bytes.ts`'s lower-level function of the same name) throws a SHA1-mismatch error when given the existing `cart/malformed/bad-sha1.p8.png` fixture — this is the actual regression test for the bug as originally reported, since the existing suite already tests `verifyHeader()` directly but never exercised `decode()`'s call path.
- New test confirming `encode()`'s output carries a correct, freshly-computed checksum, and that a decode → edit → encode → decode round trip does not throw for a real fixture — this is the regression test for the "encode() must also re-sign, or the next decode() will wrongly reject it" half of this fix.
- The existing Level 2 integration test (bit-exact decode/re-encode against original bytes, across every real fixture in `cart/`) must continue to pass unchanged — confirming every real, PICO-8-saved fixture already carries a correct checksum and isn't newly, incorrectly rejected by turning on verification. This is an explicit acceptance check for this PRD, not just an existing test that happens to still run.
- `src/app/file/FileTab.test.tsx` (added in PRD 18's test-infrastructure follow-up) gets a new or extended case using `cart/malformed/bad-sha1.p8.png` (its existing malformed-fixture test used `bad-dimensions.p8.png` specifically because `bad-sha1.p8.png` didn't yet trigger an error) to confirm the app-level inline-error path now also covers this case.

## Out of Scope

- Any change to what counts as a validly-unset checksum (all-zero header SHA1 stays unverified, not a mismatch) — existing behavior, untouched by this PRD.
- Any change to PICO-8's own cart-loading tolerance or behavior — this only affects picoedit's own `decode()`/`encode()`.
- Adopting a hashing library/npm dependency for SHA1 — the fix is a small, inline, dependency-free implementation.
- Any new or cart-specific UI copy for a "corrupted cart" error — this reuses the generic inline-error display already built in PRD 18's `FileTab`, no new UI work is designed here.

## Further Notes

This PRD's scope grew slightly from how the bug was originally reported (just "`decode()` doesn't verify") once it became clear `encode()` has the mirror-image gap (never re-signing after an edit) — fixing one without the other would have made editing-and-saving carts actively worse (spurious corruption errors on next load), so both are fixed together here.

The choice of a synchronous, hand-written SHA1 implementation over making `decode()`/`encode()` async was a deliberate tradeoff, confirmed with the user: it avoids a signature change rippling into the CLI, the React app, and every existing test that calls `decode()`/`encode()` synchronously, at the cost of maintaining a small hand-rolled SHA1 instead of relying on the platform's Web Crypto API. Two alternatives were considered and rejected: making `decode()`/`encode()` fully async (correct long-term, but a wider ripple), and leaving `decode()`/`encode()` untouched in favor of a separate opt-in async `verifyCartBytes()` helper (smaller change, but doesn't actually fix the bug as reported — `decode()` alone would still silently accept a bad-checksum cart).

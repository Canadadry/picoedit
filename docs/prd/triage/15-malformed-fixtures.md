---
title: "Malformed cart fixtures for error-path testing"
description: "Add deliberately-malformed .p8.png fixtures so error/defensive-check paths (truncated bytes, corrupt SHA1, wrong section lengths) can be integration-tested against real files instead of hand-crafted byte arrays."
status: needs-triage
---

## Problem Statement

Per spec §7's testing methodology, every correctness assertion in this project is an integration test against real `.p8.png` fixtures in `cart/` — hand-crafted synthetic unit tests were removed everywhere they existed (see PRD 10's follow-up cleanup). But every decode/encode function's error paths (`decodeGff`/`decodeGfx`/`decodeMap`/`decodeSfx`'s bounds checks, `verifyHeader`'s SHA1 mismatch, `encodeGfx`/`encodeMap`/`encodeSfx`'s length checks, etc.) can only be triggered by malformed input — no real, valid `.p8.png` a user actually has will ever be truncated or corrupted. Those checks currently have no test coverage at all as a result, since the only way to trigger them "for real" is a fixture that doesn't exist yet.

## Solution

Build a small set of deliberately-malformed `.p8.png` fixtures (e.g. `cart/malformed/truncated.p8.png`, `cart/malformed/bad-sha1.p8.png`) by programmatically corrupting a copy of an existing valid fixture, then add one integration test per error path that decodes the malformed fixture and asserts the expected function throws — replacing what would otherwise be a hand-crafted byte array with a real (if intentionally broken) file.

## User Stories

1. As a developer reviewing this codebase, I want every defensive/error-handling code path to have real test coverage, so that a regression in bounds-checking or SHA1 verification is caught the same way a regression in normal decoding would be.
2. As a developer adding a new section decoder in the future, I want an established pattern for testing its error paths against a real malformed fixture, so I don't have to reinvent hand-crafted byte arrays (which spec §7 now disallows).

## Implementation Decisions

- Malformed fixtures live under `cart/malformed/` (not mixed into the top-level `cart/` used by every other fixture-based test, so `listFixtures()`-style globs across `cart/*.p8.png` don't accidentally pick them up and fail unrelated tests).
- Each malformed fixture is generated once (e.g. via a small script or by hand) from a real, valid fixture already in `cart/`, with one specific corruption applied: truncated file length, a flipped byte inside the SHA1-covered region (without recomputing the SHA1, so `verifyHeader` fails), etc. Exact corruption list to be finalized during this PRD's planning — should cover at minimum: truncated `CartBytes` (too short for a given section's bounds check) and a bad/stale SHA1.
- This PRD does not attempt to cover every possible error path in the codebase exhaustively — start with the sections that already had hand-crafted error-path tests removed (`sfx`, and by extension the same bounds-check pattern in `gff`/`gfx`/`map`/`header`) and extend the same pattern to those.

## Testing Decisions

- One integration test per malformed fixture: decode it through the relevant function, assert the expected `Error` is thrown (message pattern, not exact string).
- No synthetic/hand-crafted byte arrays anywhere in this PRD's tests — the malformed fixtures themselves are the "hand-crafted" part, generated once and checked in as real files, not constructed inline in every test.

## Out of Scope

- Malformed fixtures for sections not yet implemented at the time this PRD is picked up (implement coverage only for what already exists).
- Exhaustive coverage of every possible corruption — a representative set per already-established error path is sufficient.

## Further Notes

Deliberately sequenced last (numbered after the rest of the core pipeline, 01-14) since it depends on the full integration-test suite already passing — see spec §7's "Testing methodology" note on error-path tests.

Note: the "PRD 10's follow-up cleanup" reference in the Problem Statement above predates
this renumbering and was already unverifiable before it (no existing PRD content
matches it) — left as-is rather than guessed at; flagged separately to the user.

---
title: "Project scaffolding + Level 1 integration test loop"
description: "Set up strict TypeScript tooling and a test runner, then implement decode()/encode() — the steganographic round-trip between a real .p8.png and its 32KB CartBytes payload — proving the whole pipeline end-to-end with one real-fixture integration test that runs via make test and must stay green through every later PRD."
status: needs-triage
---

## Problem Statement

There is no working TypeScript build/test setup yet — `package.json` only has a bare `node --test` script and no `tsconfig.json`. Nothing in the codebase can read or write a `.p8.png` file, and nothing turns its pixels into the hidden 32KB cart payload or back. Per the project's decision to build `decode`/`encode` as a single function pair whose types grow richer PRD by PRD (rather than composing separate pieces into an orchestrator at the end), the very first PRD needs its own real, fixture-based integration test proving spec §7's Level 1 round-trip — not a synthetic tracer bullet — since that same test must keep passing as a regression guardrail through every PRD that follows.

## Solution

Add a strict `tsconfig.json` (strict mode plus the modern strict extras), wire `tsx` so `node --test` can run `.ts` test files directly, add a separate `typecheck` npm script running `tsc --noEmit`, add `fast-png` as a dependency, define the branded `CartBytes` type, and implement `decode(pngBytes: Uint8Array): CartBytes` / `encode(bytes: CartBytes, originalPngBytes: Uint8Array): Uint8Array` — the steganographic round-trip through a raw ARGB pixel grid. Prove the whole pipeline end-to-end with spec §7's Level 1 integration test against the real fixtures already in `cart/`.

## User Stories

1. As a developer running `npm test`/`make test`, I want TypeScript test files to execute directly, so that I don't need a separate compile step during development.
2. As a developer running `npm run typecheck`, I want the strictest reasonable TypeScript settings enforced, so that invalid states are caught at compile time rather than at runtime.
3. As a developer with a real `.p8.png` file's bytes, I want `decode(pngBytes)` to give me the raw 32KB cart payload, so that later PRDs can decode its header and sections without me touching pixels directly.
4. As a developer with an edited `CartBytes` and the cart's original PNG bytes, I want `encode(bytes, originalPngBytes)` to produce PNG bytes PICO-8 can load, with the label/cover image preserved untouched, so that I don't have to manage pixel bits myself.
5. As a developer verifying `decode`/`encode`'s correctness, I want the round-trip checked against real fixture carts already in `cart/`, so that the test loop proves something real from the very first PRD instead of a synthetic identity function.
6. As a developer starting the next PRD, I want this Level 1 integration test already running in `make test`, so that any later PRD which accidentally breaks the pixel round-trip is caught immediately.

## Implementation Decisions

- `tsconfig.json`: `strict: true`, plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, target/module `ES2022`/`NodeNext`.
- Add `tsx` as a dev dependency; `package.json`'s `test` script becomes `node --import tsx --test 'src/**/*.test.ts'`. `make test` (already wired to `npm test`) is the single entry point for this and every later integration test — no separate watch mode, no CI, per project decision.
- Add a separate `typecheck` script: `tsc --noEmit`.
- Real fixtures already live in `cart/` at the repo root (per spec §7) — this PRD's test reads directly from `cart/*.p8.png`, no separate fixtures folder needed.
- `CartBytes`: a branded `Uint8Array` holding the 32KB packed cart payload — the only piece of the eventual `CartData` type vocabulary needed this early. The rest of that vocabulary (`CartData`, `isValid`, and the placeholder/real section types) is defined in step 02.
- `decode(pngBytes: Uint8Array): CartBytes` — internally: decode the PNG into a raw, un-premultiplied ARGB `PixelGrid` via `fast-png` (Canvas is forbidden per spec, due to premultiplied-alpha corruption risk), then assemble each cart byte from the 2 least-significant bits of 4 consecutive channel reads (A, R, G, B of one pixel), walking the 160×205 grid in PICO-8's own raster order (row-major, per spec §4).
- `encode(bytes: CartBytes, originalPngBytes: Uint8Array): Uint8Array` — the inverse: decode `originalPngBytes` into its own base `PixelGrid` (to source the upper 6 bits per channel — the label/cover image, per spec §8.5 — and preserve them untouched, since label editing isn't wired in until step 09), inject `bytes` into that grid's lower 2 bits per channel (same A,R,G,B, 2-bits-each ordering as `decode`, so the two are exact inverses), then re-encode to PNG bytes via `fast-png`. `originalPngBytes` stays a required parameter on `encode` through every later step, not just this one — step 03's header passthrough bytes are also sourced from it.
- `fast-png` is the only PNG codec dependency; it's wrapped internally by `decode`/`encode`, never re-exported.

## Testing Decisions

- Single fixture-based integration test, closing spec §7 Level 1: for each real `.p8.png` in `cart/`, `decode` it, `encode` the result back against that same fixture's own original bytes, `decode` the output again, and assert the two decoded pixel grids are byte-identical. This is the whole test suite for this PRD — it replaces what used to be a synthetic tracer-bullet test, since the point is proving the real pipeline works end-to-end against a real file from PRD 01 onward.
- No hand-crafted synthetic byte arrays or pixel grids — per spec §7's testing methodology, real fixtures are the default for every correctness assertion in this project.

## Out of Scope

- SHA1 verification/computation of the cart header — step 03.
- Any per-section decoding (gff/gfx/map/sfx/music/label/lua) — `decode`'s return type stays a flat `CartBytes` until later steps incrementally narrow it toward `CartData`.
- Editing the label image independently of `originalPngBytes` — step 09.
- CI configuration, bundler/publish tooling — deferred until the package is actually being published.

## Further Notes

This step absorbs what used to be four separate steps (scaffolding, PNG↔pixel-grid, steganographic extract, steganographic inject) into one, specifically so the project's single integration test loop (`make test`) proves something real against a live fixture starting from its very first step, rather than a synthetic identity function. Every later step that touches `decode`/`encode` must keep this test green and must state, in its own "Implementation Decisions", exactly which field it adds to the type this step and the before→after shape of that change.

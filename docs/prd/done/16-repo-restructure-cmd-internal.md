---
title: "Repo restructure: src/cmd/ + src/internal/pico8/"
description: "Split the flat src/ folder into src/cmd/ (CLI entry point and CLI-only concerns) and src/internal/pico8/ (the browser-safe cart library), so future CLI-only code has an obvious, separate home from the core library."
status: done
---

## Problem Statement

Every file — the core `decode`/`encode` library and the Node-only `cli.ts` — currently lives flat in `src/`. There's no structural signal for which files are the portable, Node-free library (per `docs/spec.md`'s browser-only constraint on the library) and which are CLI-only. As soon as CLI-only helper modules are added (starting with PNG rendering for `decode`), there's no folder to put them in that doesn't mix them in with the library files.

## Solution

Move all existing library files (everything except `cli.ts` and its test) from `src/` into `src/internal/pico8/`, and move `cli.ts` (+ `cli.test.ts`) into `src/cmd/`. Update every import path, `package.json`'s `test`/`cli` scripts, `tsconfig.json`'s `include`, and each test's relative path to the `cart/` fixture folder accordingly. No behavior changes — this is a pure file-move/import-fix. Both new folders stay nested under `src/` so the existing `Write(src/**)`/`Edit(src/**)` permission entries in `.claude/settings.json` already cover them — no settings.json change needed.

## User Stories

1. As a developer adding a new CLI-only module (e.g. PNG rendering), I want an obvious folder (`src/cmd/`) to put it in, so that it's structurally clear it's not part of the portable library.
2. As a developer working on the core library, I want all library files under one folder (`src/internal/pico8/`), so that browsing that folder alone shows the complete, Node-free surface described in `docs/spec.md`.
3. As a developer running `npm test` after the restructure, I want every existing test to still pass unmodified in behavior (only import paths change), so that the restructure is verifiably a no-op refactor.
4. As a developer running `npm run cli -- decode ...` after the restructure, I want the command to work exactly as before, so that the CLI's public usage is unaffected by where its source file lives.
5. As a developer reading `tsconfig.json` or `package.json` after the restructure, I want the `include`/test-glob/script paths to reflect the new folder layout, so that tooling isn't silently scanning a stale flat `src/` path.

## Implementation Decisions

- New folder `src/internal/pico8/` receives every current `src/*.ts` file except `cli.ts`/`cli.test.ts`: `cart.ts`, `cart-bytes.ts`, `cart-data.ts`, `cart-gff.ts`, `cart-gfx.ts`, `cart-header.ts`, `cart-label.ts`, `cart-lua.ts`, `cart-lua-encode.ts`, `cart-map.ts`, `cart-music.ts`, `cart-sfx.ts`, and their `.test.ts` counterparts, plus the cross-cutting tests `cart-header-explore.test.ts`, `cart-lua-diag.test.ts`, `cart-malformed.test.ts`, `level2.test.ts`.
- New folder `src/cmd/` receives `cli.ts` and `cli.test.ts`. This is also where CLI-only modules from PRD 17 (`palette.ts`, `render.ts`) will land.
- The name `pico8` (not `cart` or `lib`) is chosen for the library folder since it names the domain (the PICO-8 cart format), matching the project's own name and `docs/spec.md`'s subject.
- Import paths inside moved files update from sibling-relative (`./cart-bytes.ts`) to whatever remains correct after the move — files moving together within `src/internal/pico8/` keep sibling-relative imports unchanged; `src/cmd/cli.ts`'s imports of library types/functions change from `./cart.ts`/`./cart-bytes.ts` to `../internal/pico8/cart.ts`/`../internal/pico8/cart-bytes.ts`.
- Test fixture paths: every moved test currently locates the repo-root `cart/` fixture folder via `path.join(dirname(fileURLToPath(import.meta.url)), "..", "cart")`. Files moving from `src/` (one level deep) to `src/internal/pico8/` (three levels deep) need two extra `".."` segments. `src/cmd/cli.test.ts` (also three levels deep) needs the same fix.
- `package.json`: `test` script glob changes from `'src/**/*.test.ts'` to `'src/{cmd,internal}/**/*.test.ts'`; `cli` script changes from `node --import tsx src/cli.ts` to `node --import tsx src/cmd/cli.ts`.
- `tsconfig.json`: `include` stays `["src/**/*.ts"]` (already covers the nested folders) — no change needed there.
- No top-level `src/` folder removal — `src/` remains the root; only its contents get reorganized into `src/cmd/` and `src/internal/pico8/`.
- No `.claude/settings.json` changes are needed: `cmd/` and `internal/pico8/` live under `src/`, which the existing `Write(src/**)`/`Edit(src/**)` entries already cover.

## Testing Decisions

- No new tests are written for this PRD — it's a structural move. Success is verified by: `npm test` passing with the exact same set of test cases as before the move (same count, same names), and `npm run cli -- decode <fixture> <tmpdir>` producing byte-identical output to a pre-move run.
- Each moved test file is checked for any hardcoded relative-path assumption (fixture folder, sibling imports) beyond the ones already identified above, since a silently-wrong relative path (e.g. resolving to a folder that happens to exist) could pass without exercising real fixtures.

## Out of Scope

- Any change to the library's public API, `CartData`/`DecodedCart` shapes, or CLI usage/flags — pure file relocation only.
- PRD 17's PNG-rendering feature itself — this PRD only prepares the `src/cmd/` folder it will live in.

## Further Notes

PRD 17 (sprite/tilemap PNG rendering) depends on this restructure landing first, since its new `palette.ts`/`render.ts` modules are specified to live in `src/cmd/`.

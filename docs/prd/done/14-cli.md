---
title: "CLI: p8.png ⟷ JSON folder"
description: "Thin Node CLI wrapping decode()/encode() to convert a .p8.png cart to a folder of JSON/lua files and back, for use outside the browser during development."
status: done
---

## Problem Statement

The core library only exposes in-memory `decode()`/`encode()` functions; there's no way to actually convert a real `.p8.png` file on disk into inspectable/editable files, or back, without writing a throwaway script each time.

## Solution

Add a small Node CLI (`src/cli.ts`) with two subcommands — `decode <input.p8.png> <outputFolder>` and `encode <folder> <output.p8.png>` — that read/write real files using Node's `fs`, calling the existing library functions for all actual conversion logic.

## User Stories

1. As a developer with a real `.p8.png` cart, I want `picoedit decode cart.p8.png out/` to produce a folder of JSON files (plus `lua.lua`) I can open and read directly, so that I can inspect a cart's contents without writing a script.
2. As a developer who has edited the JSON files in an extracted folder, I want `picoedit encode out/ new-cart.p8.png` to produce a loadable `.p8.png` reflecting my edits, so that I can test changes in PICO-8 itself.
3. As a developer running `encode` on a folder, I want it to work without me having to separately track which original `.p8.png` it came from, so that the round-trip is a single, simple command.
4. As a developer running `encode` on a folder that's missing a required file (e.g. a deleted `sfx.json`), I want a clear error naming the missing file, rather than a confusing crash deep inside `JSON.parse` or the library.

## Implementation Decisions

- Two subcommands under one script: `decode <input> <outputFolder>`, `encode <folder> <output>`. Argument parsing is hand-rolled from `process.argv` (positional args only, no flags) — no CLI-parsing library, consistent with the project's minimalist stance on dependencies.
- `decode` writes: `lua.lua` (raw text), `gfx.json`, `gff.json`, `map.json`, `sfx.json`, `music.json`, `label.json` (each `JSON.stringify` of the corresponding `CartData` field, per spec §5), and `original.p8.png` — a verbatim copy of the input file's bytes.
- `original.p8.png` exists specifically so `encode` doesn't need a second path argument: the library's `encode()` signature has required `originalPngBytes` since step 01 (for label re-injection and header passthrough), and reading it back out of the decoded folder is simpler than asking the user to remember and pass the original cart's path separately.
- `encode` reads the 6 JSON files + `lua.lua` + `original.p8.png` from the given folder, assembles a `CartData`, and calls the library's `encode(cartData, originalBytes)`.
- This CLI is a separate, thin entry point that is the *only* place in the codebase allowed to import Node's `fs`/`process` — the core `decode`/`encode` library functions themselves remain untouched and still have zero Node/CLI dependency, preserving spec §2's browser-only constraint on the library itself. The CLI is an additional, optional consumer, not a change to what the library needs to run.
- No `bin` field or package-publishing setup yet (consistent with the earlier "single package for now" decision) — run via `npm run cli -- decode ...` / `npm run cli -- encode ...` for now.

## Testing Decisions

- Integration test using a real fixture: `decode` a fixture into a temp folder, assert all 8 expected files exist and are non-empty/parseable; `encode` that folder back into a new `.p8.png`, assert `decodePng` of the result is pixel-identical to `decodePng` of the original fixture (mirrors step 01's own Level 1 assertion, exercised here through the CLI's file-based path instead of in-memory objects).
- Error-path test: `encode` on a folder missing one required file throws an error naming that file.

## Out of Scope

- Any flags/options beyond the two positional arguments per subcommand (no `--help`, no config file, etc.).
- Packaging/publishing the CLI as a globally-installable binary.
- Watch mode, batch processing multiple carts, or any interactive UI.

## Further Notes

This is a developer-facing convenience tool, not a product surface — the eventual React app (out of scope for this whole cut) is the real "editing interface" the spec's product goal describes. This step deliberately doesn't touch `docs/spec.md` §2's "browser only" environment statement, since that constraint applies to the core library, not to this separate dev-tooling entry point — say the word if you'd rather I add a note there too.

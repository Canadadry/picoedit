---
title: "React app: shell + File tab (open/export cart)"
description: "Scaffold the Vite/React app (src/app/), wire up the tab shell and routing for all seven planned screens, and implement the File tab: drag-and-drop a .p8.png in, hold the decoded cart in shared state, and download the (possibly edited) cart back out."
status: done
---

## Problem Statement

The extraction/compaction library (`src/internal/pico8/`) and the `src/cmd/cli.ts` dev tool are the only ways to decode/encode a `.p8.png` today, and both require a terminal. There is no browser UI at all yet — no `src/app/` folder, no React/Vite dependency, nothing in `package.json` beyond the library and its Node CLI. Per `docs/spec.md` §1-2, the actual product goal is a React app that edits cart sections with a nicer UX than PICO-8's own editor; every other planned screen (code, sprite, gff, map, sfx, music) depends on this PRD landing first, since it establishes the app shell, the shared in-memory cart state, and the load/export mechanism they'll all read from and write to.

## Solution

Add a Vite + React + react-router single-page app under `src/app/`, alongside `src/cmd/` and `src/internal/pico8/` (this nesting keeps the whole app inside `src/`, matching the "everything lives under src/" convention established when PRD 16 landed — no new top-level folder, no `.claude/settings.json` permission change needed). The app has a persistent tab bar with one entry per `CartData` section — File, Code, Sprite, GFF, Map, Sfx, Music — routed via `react-router`. Only the File tab has real content in this PRD; the other six render a simple "not built yet" placeholder so the shell is visibly complete and later PRDs only need to fill in one tab's route, not touch the shell.

A single React context (`src/app/state/CartContext.tsx`) holds the app's entire editable state: the currently loaded cart (`DecodedCart | null` from `src/internal/pico8/cart.ts`) plus the original `.p8.png` bytes and filename it came from (needed for `encode()`'s `originalPngBytes` parameter and for naming the download). It's provided once at the app root so every tab (this PRD's File tab, and every future editor tab) reads and mutates the same in-memory cart — there is no persistence beyond the page's lifetime, and no multi-cart/session concept, matching the "one cart at a time" decision.

The File tab itself is a drag-and-drop zone (also clickable to open a native file picker) that:
- on drop/pick of a `.p8.png`, reads it as bytes, calls `decode()`, and stores the result + original bytes + filename in `CartContext`; on decode failure, shows an inline error message and stays on the drop zone (no cart loaded);
- once a cart is loaded, shows the loaded filename and a "Download" button that calls `encode(cart, originalPngBytes)` and triggers a browser download named after the original file (or `cart.p8.png` if unknown), enabled at all times a cart is loaded (whether or not anything's actually been edited yet — same behavior as re-saving an unmodified file);
- dropping a new `.p8.png` while a cart is already loaded replaces it immediately and discards any in-memory edits to the previous one, with no confirmation prompt (see Further Notes).

## User Stories

1. As someone who just cloned the repo, I want `npm run dev` to start a Vite dev server showing the app shell with all seven tabs visible, so that I can see the full planned scope even before every tab is built.
2. As a user, I want to drag a `.p8.png` onto the File tab and have it load, so that I can start editing it in the other tabs.
3. As a user who dropped something that isn't a valid cart, I want a clear inline error instead of a silent failure or a crash, so that I know to try a different file.
4. As a user with a cart loaded, I want a Download button that gives me back a valid, loadable `.p8.png` reflecting whatever I've edited so far in any tab, so that I can save my work and open it in PICO-8.
5. As a user who wants to start over, I want dropping a new cart onto the File tab to just replace the current one, so that switching carts is a single action, not a multi-step "close, then open" flow.

## Implementation Decisions

- **Stack**: Vite + React + `react-router` + a shadcn-style component set (Tailwind + Radix primitives, copied into the repo rather than pulled in as a component-library runtime dependency) — matches the "least dependency" direction: Vite/Tailwind/Radix are the only new `package.json` entries this PRD adds, all as `devDependencies` except `react`, `react-dom`, `react-router`, and the small set of Radix primitives actually used. (Note: `react`, `react-dom`, `react-router`, Vite, Tailwind, and the shadcn foundational packages were already installed by a prior tooling-scaffold commit — check `package.json` before adding anything, don't duplicate entries that already exist.)
- **Folder shape** (as specified): `src/app/<tab>/` per tab (`src/app/file/`, `src/app/code/`, `src/app/sprite/`, `src/app/gff/`, `src/app/map/`, `src/app/sfx/`, `src/app/music/`), each with one main component (e.g. `src/app/file/FileTab.tsx`) and a `components/` subfolder for anything else that tab needs. Cross-tab concerns get ordinary top-level folders: `src/app/state/` for `CartContext.tsx`, `src/app/App.tsx` + `src/app/main.tsx` for the shell/entry point, `src/app/hooks/` reserved for future shared hooks, `src/app/lib/utils.ts` for the existing `cn()` helper (already scaffolded).
- **Routing**: `react-router` with one route per tab (`/`, redirecting to `/file`; `/code`, `/sprite`, `/gff`, `/map`, `/sfx`, `/music`), a shared layout component rendering the tab bar + `<Outlet />`. Placeholder tabs are a one-line "not built yet" component, not stubbed-out real components, to keep this PRD's diff scoped to the shell + File tab only.
- **Cart state**: `CartContext` exposes `{ cart: DecodedCart | null; originalPngBytes: Uint8Array | null; fileName: string | null; loadCart(pngBytes, fileName): void; updateCart(patch: Partial<DecodedCart>): void }`. `loadCart` runs `decode()` and throws on failure — the File tab catches this at the call site to show its inline error, the context itself doesn't hold error state (no other tab needs it).
- **Download**: uses `encode(cart, originalPngBytes)` from `src/internal/pico8/cart.ts` (unchanged, already implemented), wraps the result in a `Blob`, and triggers it via a temporary `<a download>` element — no File System Access API (per the Tauri-webview-compatibility decision), works identically once wrapped later.
- **TypeScript config**: the root `tsconfig.json` uses `module`/`moduleResolution: NodeNext` for the Node-run library/CLI, which is the wrong resolution mode for a Vite-bundled browser app. Adds `src/app/tsconfig.json` (referenced from `vite.config.ts`) with `moduleResolution: "bundler"` and `jsx: "react-jsx"`, scoped to `src/app/**/*.tsx`/`src/app/**/*.ts` only — the root config's `include` is unaffected (it already covers all of `src/**/*.ts` per PRD 16, but `src/app/tsconfig.json` overrides resolution mode for just that subtree via project references). `vite.config.ts`'s `root` should point at `src/app` (check whether a prior scaffold commit already set this before assuming it's missing). Imports from `src/app/` into `src/internal/pico8/*.ts` keep this repo's existing explicit-`.ts`-extension import style.
- **No persistence**: reloading the page loses the loaded cart and any edits — matches "one cart at a time, no session" from the design discussion. Not a bug to fix later unless explicitly requested.

## Testing Decisions

- No automated test suite is added for `src/app/` in this PRD. The project's existing testing philosophy (`docs/spec.md` §7: real-fixture integration tests) doesn't map cleanly onto React component testing, and picking a framework (Vitest + React Testing Library are the obvious pairing with Vite, but are new dependencies) is a tooling decision better made in the deferred "code organization" discussion rather than unilaterally here.
- Verification for this PRD is manual: run `npm run dev`, drag a real fixture from `cart/` onto the File tab, confirm it loads without error, click Download, and confirm the downloaded file round-trips through `cli decode` (or is byte-behaviorally equivalent — loadable in PICO-8) the same way `src/cmd/cli.test.ts`'s existing encode/decode round-trip already verifies for the CLI path. A malformed fixture (`cart/malformed/*.p8.png`) is dropped to confirm the inline error path.

## Out of Scope

- Any actual section editor (Code/Sprite/GFF/Map/Sfx/Music tabs) — each gets its own PRD.
- Multi-cart sessions, undo/redo, autosave/localStorage persistence.
- A confirmation dialog before a new drop replaces an already-loaded cart's in-memory edits (see Further Notes).
- File System Access API / any live-file-handle "save back to the same file" flow — deferred indefinitely given the Tauri end target.
- Automated component/UI tests — framework choice deferred to the code-organization discussion.
- The Label tab — dropped from scope per current discussion; no route, placeholder, or mention in the tab bar for it.

## Further Notes

Silent replace-on-drop (no "discard changes?" confirmation) was a judgment call, not an explicit instruction — flagged for review. If unwanted, the fix is small (a confirm dialog in `FileTab`'s drop handler, gated on `cart !== null`) and doesn't affect any other PRD's design.

This PRD is the dependency root for all six section-editor PRDs (19-24): each of them adds one route's real component plus reads/writes `CartContext`, and none of them touch the shell, routing, or File tab itself.

**Path note**: this PRD originally specified a top-level `app/` folder (sibling to `src/`); it's been amended to `src/app/` so the whole tree — library, CLI, and UI — lives under `src/`, matching the convention PRD 16 established and staying within the existing `Write(src/**)`/`Edit(src/**)` permissions (no `.claude/settings.json` change needed). If a prior tooling-scaffold pass already created `vite.config.ts` with `root: "app"` (not `"src/app"`), that needs correcting as part of this PRD.

**Verification caveat**: this PRD's implementation was validated by code review, `make test` (479/479), and `make build` (including confirming, by inspecting the built bundle, that the `node:assert/strict`-in-browser fix in `vite.config.ts`'s `resolve.alias` is real and not dead code) — but the PRD's own manual verification steps (drag a real fixture onto the File tab in an actual browser, click Download and confirm the file round-trips, drop a malformed fixture and confirm the inline error) were **not** exercised. This dev environment has no X server and no installed browser, and the `claude-in-chrome` extension isn't connected here, so no real-browser check is possible in this pipeline. Whoever next opens this app in an actual browser should run through those three manual checks before treating the File tab as fully validated in practice.

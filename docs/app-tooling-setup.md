# Task: prepare tooling for the React app (no feature code)

You are setting up picoedit's tooling so implementation of the drafted PRDs in
`docs/prd/triage/` (16-26) can begin without hitting missing-dependency or
permission-prompt friction. **This is infrastructure prep only.** Do not
implement any PRD's actual feature code — no `CartContext`, no tab
components, no routes. The one exception: a minimal placeholder entry point
(blank page, e.g. an "picoedit" heading) is fine if you need it to prove
`npm run dev` actually boots — nothing beyond that.

Read `docs/prd/triage/18-app-file-tab.md` first — it's the PRD that pins down
the stack and conventions everything below exists to support: Vite + React +
`react-router`, a shadcn-style component approach (Radix primitives copied in
per-component as needed, not a UI-library runtime dependency), a new `app/`
folder, and a separate `app/tsconfig.json` (`moduleResolution: "bundler"`)
since the root `tsconfig.json` uses `NodeNext` for the Node-run library/CLI
and is the wrong resolution mode for a Vite-bundled browser app.

Before changing anything, read the current state of `package.json`,
`Makefile`, and `.claude/settings.json` — don't duplicate entries that
already exist, and don't assume anything below is missing without checking.

## 1. Install npm packages

Runtime dependencies: `react`, `react-dom`, and a router — check npm for the
current recommended package for a Vite SPA (`react-router` is the unified
package as of v7+; use `react-router-dom` only if that's still what the
current stable major recommends — verify rather than assume).

Dev dependencies: `vite`, `@vitejs/plugin-react`, `@types/react`,
`@types/react-dom`, and Tailwind — prefer Tailwind v4's `@tailwindcss/vite`
plugin (no separate `postcss.config`/`autoprefixer` needed) over the v3
PostCSS setup, since it's fewer moving parts.

For the shadcn-style component approach: install just the small foundational
trio most shadcn components depend on — `class-variance-authority`, `clsx`,
`tailwind-merge` — plus `lucide-react` for icons, and add a `cn()` helper
(the standard `clsx` + `tailwind-merge` combinator) at `app/lib/utils.ts`.

**Do not** run `npx shadcn@latest init` or copy in any actual Radix
component yet — shadcn's own convention is to copy in only the component a
screen actually needs, and no screen exists yet. Each section-tab PRD
(19-24) adds its own components when it's implemented. Installing Radix
packages now for components nothing uses yet contradicts the project's
"least dependency" direction.

## 2. `package.json` script additions

Add (don't remove or rename the existing `test`/`typecheck`/`cli` scripts):

```json
"dev": "vite",
"build": "vite build"
```

Put `vite.config.ts` at the repo root with `root: "app"` (and
`build.outDir` pointed somewhere sensible, e.g. `dist/`) — keeps a single
`package.json`/single dev-server command per the earlier "stay flat, no
workspaces" decision, while `app/` stays the actual app source root with its
own `index.html`.

## 3. TypeScript config

- Leave the root `tsconfig.json` untouched — it governs the Node-run
  library/CLI (`src/` today, `cmd/`+`internal/pico8/` after PRD 16) and must
  keep `NodeNext` resolution.
- Add `app/tsconfig.json`: `moduleResolution: "bundler"`, `jsx: "react-jsx"`,
  `lib: ["ES2022", "DOM"]`, `include` scoped to `app/**/*.ts`/`app/**/*.tsx`
  only. Reference it from `vite.config.ts`.
- If `vite.config.ts` itself needs type-checking config, give it its own
  minimal node-flavored tsconfig rather than folding it into either of the
  above two.

## 4. `Makefile`

Follow the existing pattern (each target sources `nvm.sh`, then runs an npm
script):

```makefile
.PHONY: install test cli dev build

dev:
	bash -c 'source $(NVM_SH) && npm run dev'

build:
	bash -c 'source $(NVM_SH) && npm run build'
```

Add `dev` and `build` to the existing `.PHONY` line rather than duplicating
it.

## 5. `.claude/settings.json` permissions

Add to `permissions.allow`:

- `Edit(app/**)`, `Write(app/**)`
- `Edit(cmd/**)`, `Write(cmd/**)`
- `Edit(internal/**)`, `Write(internal/**)`

Leave the existing `Edit(src/**)`/`Write(src/**)` entries in place for
now — PRD 16 (repo restructure) hasn't landed yet, so `src/` is still live.
PRD 16's own Further Notes already flags that those two entries should be
*removed* once that PRD actually executes and `src/` is deleted; that's a
follow-up for whoever implements PRD 16, not this task.

For Bash, this project runs in `dontAsk` mode — every allowed pattern
executes with **no confirmation**, so keep new entries as narrow as the
existing ones (compare `Bash(make cli*)`, which wildcards only because `cli`
genuinely takes free-form `ARGS`). Concretely:

- `Bash(make dev)`, `Bash(make build)` — exact match, these scripts take no
  arguments.
- `Bash(npm run dev)`, `Bash(npm run build)` — exact match, same reason.
- `Bash(npm install)` — **bare, no wildcard.** This installs exactly what's
  pinned in `package.json`/`package-lock.json`, which is safe to run
  unattended. Do **not** add a wildcarded `Bash(npm install *)` — that would
  let any future session silently add arbitrary new packages with no
  confirmation, which is a real supply-chain-relevant permission to grant
  casually. If a future PRD needs a new package, that's a normal
  user-confirmed `npm install <pkg>` call, not something pre-authorized here.

## 6. Verify before declaring done

- `npm run typecheck` and `npm test` still pass unchanged (the library/CLI
  are untouched by any of this).
- `npm run dev` boots a Vite dev server serving `app/`'s placeholder page
  with no console errors.
- `npm run build` produces output without errors.
- Confirm no PRD file under `docs/prd/` was edited and no PRD's `status` was
  changed — this task is tooling only.

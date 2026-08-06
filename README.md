# picoedit

TypeScript/React toolkit to extract a PICO-8 cart (`.p8.png`) into editable
text/JSON files and repack them into a valid `.p8.png`. See
[`docs/spec.md`](docs/spec.md) for the full spec and section-by-section
design decisions.

## Development

Requires Node.js. Install dependencies, then:

```sh
npm install
npm test          # runs src/{cmd,internal}/**/*.test.ts via tsx + node --test
npm run typecheck # tsc --noEmit, strict mode
```

The browser-safe cart library lives in `src/internal/pico8/`, one
`*.test.ts` file next to each module it covers, plus
`src/internal/pico8/level2.test.ts` for the cross-cutting spec §7 Level 2
check (decode real fixtures into sections, re-encode, and compare each
section's bytes against the original per-section rather than per-module).
Node-only CLI code lives separately in `src/cmd/`. Real `.p8.png` cartridge
fixtures for integration tests live in `cart/` at the repo root.

Once, after cloning, run `sh scripts/git-hooks/install.sh` to install a
pre-commit hook that strips disposable `//` comments from newly added lines
(everything except `// TODO` comments).

### CLI

`src/cmd/cli.ts` is a small Node dev-tooling entry point (not part of the
browser-only library) for converting a real `.p8.png` cart to a folder of
editable files and back:

```sh
npm run cli -- decode cart.p8.png out/     # writes lua.lua, gfx.json, gff.json,
                                            # map.json, sfx.json, music.json,
                                            # label.json, original.p8.png into out/
npm run cli -- encode out/ new-cart.p8.png # reassembles those files into a
                                            # loadable .p8.png
```

`encode` reads `original.p8.png` back out of the folder itself, so there's no
need to separately track which cart an extracted folder came from. Running
`encode` on a folder that's missing one of the required files fails with an
error naming that specific file.

## Remaining work

See `docs/prd/triage/` for PRDs not yet implemented, and `docs/prd/` for
implemented ones.

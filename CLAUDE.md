# picoedit

TypeScript/React toolkit to extract a PICO-8 cart (`.p8.png`) into editable text files and repack them into a valid `.p8.png` (see `docs/spec.md`).

Permissions run in `dontAsk` mode (no confirmation for allowed actions): check `.claude/settings.json` for the exact list of allowed commands before assuming a new one.

`tmp/` : seul dossier temporaire autorisé, seul dossier avec droits de suppression.

The `git-commit` skill strips every comment from newly added lines except ones starting with `// TODO`. If you take a shortcut or leave something unfinished, mark it with a `// TODO` comment — any other comment on a new line will be silently deleted at commit time.

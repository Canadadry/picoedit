# Skill changes needed for the decode/encode restructuring

Claude Code has no write access to `.claude/skills/**`, so the changes below have to be
applied by hand. This file is the spec for those changes — not the changes themselves.

Context: the PRD roadmap is being restructured around a single `decode`/`encode`
function pair whose types grow PRD by PRD (starting as raw bytes, ending as the full
`CartData` from spec §8.7), with one fixture-based integration test (spec §7 Level 1),
introduced in the new PRD 01, run via `make test` and expected to stay green through
every later PRD. That restructuring itself (renumbering/merging/rewriting the actual
`docs/prd/*.md` files) is a separate piece of work, not covered by this file.

## 1. `prd-autopilot`: split "implement" and "verify+commit" into two agents

Current behavior (SKILL.md step 4, "Graduate, commit, push — no checking"): the same
implementer agent that reports `DONE:` is trusted blindly — the orchestrator runs
`git add -A` and commits without re-running tests or reviewing the diff.

Change: on receiving `DONE:` from the implementer, spawn a second, fresh agent (no
memory of the implementation) whose only job is to:

- Run `make test` itself and confirm it actually passes — don't trust the implementer's
  claim.
- Confirm a substantial, expected change happened (non-trivial diff touching the files
  implied by the PRD).
- Only if both hold, perform the graduation steps (frontmatter `status`, `git mv`,
  `git add`, `git commit`, `git push`). Otherwise report a failure back to the
  orchestrator instead of committing.

The implementer agent's prompt needs one addition: `DONE:` means "implementation
finished," not "safe to commit" — that determination belongs to the verifier agent, not
to it.

## 2. `prd-autopilot`: fix references to a nonexistent settings file / target

- Replace every reference to `.claude/settings.local.json` with `.claude/settings.json`
  — that file doesn't exist; the real, canonical one is `.claude/settings.json` (see
  CLAUDE.md).
- Remove the `make test-all` mention from the pre-authorized command list. No such
  Makefile target exists (only `install`, `test`, `cli`), and no agent can add one —
  `Edit(Makefile)`/`Write(Makefile)` are both denied in `.claude/settings.json`. If a
  distinct "test-all" mode is actually wanted, adding the target is a manual edit
  outside any agent's permissions.

## 3. No skill currently handles restructuring already-graduated PRDs

`to-prd` only appends new PRDs to `docs/prd/triage/`. `prd-autopilot` only graduates one
triage PRD at a time, on the explicit assumption that graduated PRDs are numbered
contiguously and never revisited. Neither handles merging, deleting, or renumbering
PRDs that already have `status: done`.

The concretely dangerous part: 36 prose cross-references of the form "step NN" /
"steps NN-NN" are scattered across `docs/prd/*.md` (e.g. `04-stegano-extract.md` →
"step 06", "step 05"; `17-compact.md` → "step 16", "step 18"; `19-cli.md` →
"step 17"). Any renumbering silently invalidates these — nothing greps or updates them
automatically.

This is a one-time migration, not a recurring workflow, so no new SKILL.md is proposed
here for it. But whoever does the renumbering — by hand or via a one-off agent pass —
must grep every `docs/prd/*.md` for `step [0-9]` and fix each reference to match the
new numbering, not just move/rename the files.

## 4. Content requirement for new-architecture PRDs (not a skill mechanism change)

Starting at the PRD that becomes the new "header + SHA1" step onward, every PRD that
touches `decode`/`encode` must state in its "Implementation Decisions" section:

- Exactly which field is being added to `decode`'s return type / `encode`'s input type
  at this step.
- The before → after shape of that transformation — what the type looked like going in,
  what it looks like coming out.

This isn't a skill behavior change — it's guidance for whoever (re)writes these PRD
files, so an implementing agent doesn't have to infer the type transformation purely
from reading the current state of the code.

## 5. `grill-me`: enforce open-ended, one-at-a-time questioning

Current behavior (SKILL.md): no guidance on question format — the interviewer is free
to batch multiple questions per turn, use multiple-choice/proposition-style questions,
or use the `AskUserQuestion` tool at any point in the interview.

Change: add this line to SKILL.md — "One question at a time, fully open, never via
AskUserQuestion or listed options — except to calibrate: once an answer already gives
you enough, restate your understanding as a plain-text proposition to confirm instead
of repeating the question."

Reason: multiple-choice-style questions — whether through the tool or by listing
options in text — constrain the user to the interviewer's pre-guessed set of answers
instead of letting them express their own reasoning, which defeats the purpose of this
skill. But once an answer already contains enough signal, another open question just
restates what was already said — that's when a plain-text proposition to confirm/correct
is more useful than repeating the same open question, regardless of how far along the
interview is.

## 6. `tdd`: doesn't fit picoedit's single-integration-test PRD loop

Current behavior (SKILL.md "Tracer Bullet" / "Incremental Loop" / Checklist): assumes a
growing suite of per-behavior unit tests — "one test at a time," write the next test,
write minimal code to pass it, repeat. Invoked as-is by `prd-autopilot` for every PRD.

Problem: this project's PRD roadmap (see the restructuring context at the top of this
file) runs on a single fixture-based integration test (spec §7 Level 1), introduced once
in PRD 01 and expected to stay green through every later PRD — there is no "next test"
to write per PRD. Following the skill as written pushes an implementer agent toward
writing new unit tests each cycle (wrong test shape for this project) and toward more
verbose, heavily-commented code than the project wants (comments beyond `// TODO` get
silently stripped at commit time by the `git-commit` skill anyway, so writing them is
wasted work).

Change: add this section to `tdd/SKILL.md`, without altering the rest of the file:

```markdown
## picoedit override: single integration test loop

This project's PRD roadmap runs on one fixture-based integration test (spec §7 Level 1),
introduced once and expected to stay green through every later PRD — not a growing suite
of per-behavior unit tests. When this skill is invoked here:

- Skip "Tracer Bullet" and "Incremental Loop" as written — there is no next test to
  write. Extend `decode`/`encode`'s types incrementally, running `make test` after each
  change to confirm the existing integration test still passes.
- Keep code minimal — no comments beyond `// TODO` (see CLAUDE.md / git-commit skill,
  which strips anything else on new lines).
```

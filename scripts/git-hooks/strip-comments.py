#!/usr/bin/env python3
"""Pre-commit hook: strip disposable `//` comments from newly added lines.

Enforces the rule in CLAUDE.md - a commit's newly added lines keep
`// TODO` comments but lose every other `//` comment. Runs against the
staged diff so it applies to every commit, not just ones made through the
git-commit skill.

Installed via scripts/git-hooks/install.sh -> .git/hooks/pre-commit.
"""
import re
import subprocess
import sys

COMMENT_EXTENSIONS = (".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs")


def run(*args):
    return subprocess.run(args, capture_output=True, text=True, check=True).stdout


def added_line_numbers(path):
    """Line numbers (1-indexed, in the new file) added by the staged diff for `path`."""
    diff = run("git", "diff", "--cached", "-U0", "--", path)
    lines = set()
    cur = None
    for line in diff.splitlines():
        if line.startswith("@@"):
            m = re.search(r"\+(\d+)", line)
            cur = int(m.group(1))
        elif line.startswith("+") and not line.startswith("+++"):
            lines.add(cur)
            cur += 1
    return lines


def strip_comment(line):
    """Return (new_line_or_None, changed). None means delete the line."""
    in_string = None
    i, n = 0, len(line)
    while i < n:
        ch = line[i]
        if in_string:
            if ch == "\\":
                i += 2
                continue
            if ch == in_string:
                in_string = None
            i += 1
            continue
        if ch in ("'", '"', "`"):
            in_string = ch
            i += 1
            continue
        if ch == "/" and i + 1 < n and line[i + 1] == "/":
            comment_body = line[i + 2:].lstrip()
            if comment_body.lower().startswith("todo"):
                return line, False
            code = line[:i].rstrip()
            return (code or None), True
        i += 1
    return line, False


def process_file(path):
    targets = added_line_numbers(path)
    if not targets:
        return False

    with open(path, "r", encoding="utf-8") as f:
        original = f.readlines()

    changed = False
    result = []
    for idx, raw in enumerate(original, start=1):
        if idx not in targets:
            result.append(raw)
            continue
        has_nl = raw.endswith("\n")
        body = raw[:-1] if has_nl else raw
        new_body, line_changed = strip_comment(body)
        if line_changed:
            changed = True
        if new_body is None:
            continue
        result.append(new_body + ("\n" if has_nl else ""))

    if changed:
        with open(path, "w", encoding="utf-8") as f:
            f.writelines(result)
        run("git", "add", path)
    return changed


def main():
    staged = run(
        "git", "diff", "--cached", "--name-only", "--diff-filter=ACM"
    ).splitlines()
    any_changed = False
    for path in staged:
        if not path.endswith(COMMENT_EXTENSIONS):
            continue
        if process_file(path):
            any_changed = True
    if any_changed:
        print(
            "pre-commit: stripped disposable // comments from newly added lines",
            file=sys.stderr,
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())

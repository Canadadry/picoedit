/**
 * Framework-free helpers behind the Code tab: PICO-8's `-->8` tab-splitting
 * convention, the line-editing shortcuts, byte-range validation, and simple
 * find. Kept pure (no React, no cart access) so they're unit-testable on
 * their own, per docs/spec.md §7's guidance to hand-test genuinely
 * non-trivial algorithmic logic.
 */

export const TAB_MARKER = "-->8";
export const MAX_TABS = 8;
export const COMPRESSED_SIZE_WARNING_RATIO = 0.9;

/** Splits a single Lua source into PICO-8 tab segments on lines matching exactly `-->8`. */
export function splitIntoTabs(lua: string): string[] {
  const lines = lua.split("\n");
  const segments: string[][] = [[]];
  for (const line of lines) {
    if (line === TAB_MARKER) {
      segments.push([]);
    } else {
      segments[segments.length - 1]!.push(line);
    }
  }
  return segments.map((segment) => segment.join("\n"));
}

/** Rejoins tab segments into a single Lua source, the exact inverse of splitIntoTabs. */
export function joinTabs(segments: string[]): string {
  return segments.join(`\n${TAB_MARKER}\n`);
}

function currentLineBounds(text: string, pos: number): { lineStart: number; lineEnd: number } {
  const lineStart = text.lastIndexOf("\n", Math.max(pos - 1, 0)) + 1;
  const nextNewline = text.indexOf("\n", pos);
  const lineEnd = nextNewline === -1 ? text.length : nextNewline;
  return { lineStart, lineEnd };
}

export interface DuplicateLineResult {
  text: string;
  cursorPos: number;
}

/** Ctrl/Cmd+D: inserts a copy of the line under the cursor directly below it. */
export function duplicateLine(text: string, cursorPos: number): DuplicateLineResult {
  const { lineStart, lineEnd } = currentLineBounds(text, cursorPos);
  const line = text.slice(lineStart, lineEnd);
  const newText = text.slice(0, lineEnd) + "\n" + line + text.slice(lineEnd);
  return { text: newText, cursorPos: cursorPos + line.length + 1 };
}

export interface LineCommentResult {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

/** Ctrl/Cmd+/ or Ctrl/Cmd+B: toggles a `--` line-comment prefix across every line touched by the selection. */
export function toggleLineComment(text: string, selectionStart: number, selectionEnd: number): LineCommentResult {
  const lineStart = text.lastIndexOf("\n", Math.max(selectionStart - 1, 0)) + 1;
  const nextNewline = text.indexOf("\n", selectionEnd);
  const lineEnd = nextNewline === -1 ? text.length : nextNewline;

  const lines = text.slice(lineStart, lineEnd).split("\n");
  const nonBlank = lines.filter((line) => line.trim().length > 0);
  const allCommented = nonBlank.length > 0 && nonBlank.every((line) => line.trimStart().startsWith("--"));

  const newLines = lines.map((line) => {
    if (!allCommented) return `--${line}`;
    const idx = line.indexOf("--");
    if (idx === -1) return line;
    const after = line.slice(idx + 2);
    return line.slice(0, idx) + (after.startsWith(" ") ? after.slice(1) : after);
  });
  const newBlock = newLines.join("\n");

  return {
    text: text.slice(0, lineStart) + newBlock + text.slice(lineEnd),
    selectionStart: lineStart,
    selectionEnd: lineStart + newBlock.length,
  };
}

/**
 * Indices (UTF-16 code unit offsets, matching <textarea> selection offsets) of
 * characters `encodeLua`'s `charCodeAt(i) & 0xff` truncation would silently
 * corrupt on export, i.e. every character outside the single-byte 0x00-0xff range.
 */
export function findOutOfRangeIndices(text: string): number[] {
  const indices: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 0xff) indices.push(i);
  }
  return indices;
}

const FUNCTION_LINE = /^\s*(local\s+)?function\b/;

/** Character offsets of each top-level `function`/`local function` line, regex-matched (not real Lua parsing). */
export function findFunctionBoundaries(text: string): number[] {
  const boundaries: number[] = [];
  let offset = 0;
  for (const line of text.split("\n")) {
    if (FUNCTION_LINE.test(line)) boundaries.push(offset);
    offset += line.length + 1;
  }
  return boundaries;
}

/** Alt+Up/Down: jumps the cursor to the start of the previous/next function line, or null if there is none. */
export function jumpToFunction(text: string, cursorPos: number, direction: "prev" | "next"): number | null {
  const boundaries = findFunctionBoundaries(text);
  if (direction === "next") {
    const next = boundaries.find((boundary) => boundary > cursorPos);
    return next ?? null;
  }
  const before = boundaries.filter((boundary) => boundary < cursorPos);
  return before.length > 0 ? before[before.length - 1]! : null;
}

/** Ctrl/Cmd+F: case-insensitive search starting at fromIndex, wrapping to the start when needed. */
export function findNextMatch(text: string, query: string, fromIndex: number): number | null {
  if (!query) return null;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const found = lowerText.indexOf(lowerQuery, fromIndex);
  if (found !== -1) return found;
  const wrapped = lowerText.indexOf(lowerQuery, 0);
  return wrapped === -1 ? null : wrapped;
}

import {
  duplicateLine,
  findNextMatch,
  findOutOfRangeIndices,
  joinTabs,
  jumpToFunction,
  splitIntoTabs,
  toggleLineComment,
} from "./tools.ts";

test("splitIntoTabs splits a lua source into segments on lines matching exactly -->8", () => {
  const lua = "line1\nline2\n-->8\nline3\n-->8\nline4\nline5";

  const segments = splitIntoTabs(lua);

  expect(segments).toEqual(["line1\nline2", "line3", "line4\nline5"]);
});

test("splitIntoTabs on a source with no marker returns a single segment", () => {
  const lua = "just one tab\nof code";

  expect(splitIntoTabs(lua)).toEqual(["just one tab\nof code"]);
});

test("joinTabs rejoins segments with -->8 marker lines, round-tripping splitIntoTabs exactly", () => {
  const lua = "line1\nline2\n-->8\nline3\n-->8\nline4\nline5";

  const segments = splitIntoTabs(lua);

  expect(joinTabs(segments)).toBe(lua);
});

test("duplicateLine inserts a copy of the line under the cursor directly below it", () => {
  const text = "aaa\nbbb\nccc";

  const result = duplicateLine(text, 5);

  expect(result.text).toBe("aaa\nbbb\nbbb\nccc");
});

test("duplicateLine places the cursor at the same column within the new copy", () => {
  const text = "aaa\nbbb\nccc";

  const result = duplicateLine(text, 5);

  expect(result.cursorPos).toBe("aaa\nbbb\nb".length);
});

test("toggleLineComment on an uncommented single line prefixes it with --", () => {
  const text = "aaa\nbbb\nccc";

  const result = toggleLineComment(text, 5, 5);

  expect(result.text).toBe("aaa\n--bbb\nccc");
});

test("toggleLineComment on an already-commented line strips the -- prefix (toggle back off)", () => {
  const text = "aaa\n--bbb\nccc";

  const result = toggleLineComment(text, 6, 6);

  expect(result.text).toBe("aaa\nbbb\nccc");
});

test("toggleLineComment across a multi-line selection comments every covered line together", () => {
  const text = "aaa\nbbb\nccc";

  const result = toggleLineComment(text, 1, 9);

  expect(result.text).toBe("--aaa\n--bbb\n--ccc");
});

test("findOutOfRangeIndices flags characters encodeLua's & 0xff truncation would corrupt, and only those", () => {
  const text = "oké";

  expect(findOutOfRangeIndices(text)).toEqual([]);
});

test("findOutOfRangeIndices flags a multi-byte Unicode character (e.g. an emoji) pasted into the source", () => {
  const text = "a\u{1f600}b";

  const indices = findOutOfRangeIndices(text);

  expect(indices.length).toBeGreaterThan(0);
  expect(indices).not.toContain(0);
  expect(indices).not.toContain(text.length - 1);
});

test("jumpToFunction(next) moves the cursor to the start of the next top-level function/local function line", () => {
  const text = "local x = 1\nfunction foo()\nend\nlocal function bar()\nend";

  const pos = jumpToFunction(text, 0, "next");

  expect(text.slice(pos!, pos! + 8)).toBe("function");
});

test("jumpToFunction(prev) moves the cursor back to the start of the previous function line", () => {
  const text = "function foo()\nend\nlocal function bar()\nend";
  const barLineStart = text.indexOf("local function bar");

  const pos = jumpToFunction(text, barLineStart, "prev");

  expect(pos).toBe(0);
  expect(text.slice(pos!, pos! + 8)).toBe("function");
});

test("jumpToFunction returns null when there is no further function to jump to", () => {
  const text = "function foo()\nend";

  expect(jumpToFunction(text, text.length, "next")).toBeNull();
});

test("findNextMatch finds the next case-insensitive occurrence of the query after fromIndex", () => {
  const text = "print(1)\nPRINT(2)\nprint(3)";

  expect(findNextMatch(text, "print", 1)).toBe(text.indexOf("PRINT"));
});

test("findNextMatch wraps around to the start of the text when no match remains after fromIndex", () => {
  const text = "print(1)\nprint(2)";

  expect(findNextMatch(text, "print", text.length)).toBe(0);
});

test("findNextMatch returns null when the query isn't found anywhere in the text", () => {
  const text = "print(1)";

  expect(findNextMatch(text, "missing", 0)).toBeNull();
});

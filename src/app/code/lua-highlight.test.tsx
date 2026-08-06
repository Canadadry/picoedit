import { tokenizeLuaLine } from "./lua-highlight.ts";

test("tokenizeLuaLine tags a Lua keyword as a keyword token", () => {
  const tokens = tokenizeLuaLine("local x = 1");

  expect(tokens).toContainEqual({ type: "keyword", text: "local" });
});

test("tokenizeLuaLine tags a quoted string as a string token, not splitting on spaces inside it", () => {
  const tokens = tokenizeLuaLine('print("hello world")');

  expect(tokens).toContainEqual({ type: "string", text: '"hello world"' });
});

test("tokenizeLuaLine tags a trailing -- comment as a single comment token to end of line", () => {
  const tokens = tokenizeLuaLine("x = 1 -- set x");

  expect(tokens).toContainEqual({ type: "comment", text: "-- set x" });
});

test("tokenizeLuaLine tags a numeric literal as a number token", () => {
  const tokens = tokenizeLuaLine("y = 42");

  expect(tokens).toContainEqual({ type: "number", text: "42" });
});

test("tokenizeLuaLine concatenated tokens reproduce the original line exactly", () => {
  const line = 'local msg = "hi" -- comment 123';

  const tokens = tokenizeLuaLine(line);

  expect(tokens.map((t) => t.text).join("")).toBe(line);
});

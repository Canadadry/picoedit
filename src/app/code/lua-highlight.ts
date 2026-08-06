/**
 * Small hand-written regex tokenizer for Lua keyword/string/comment/number
 * coloring in the Code tab's syntax-highlighting overlay — not a real Lua
 * lexer (see PRD 22's Out of Scope). Tokenized one line at a time, so a
 * `--[[ ]]` or `[[ ]]` block comment/string spanning multiple lines is
 * highlighted per-fragment-per-line rather than as one continuous token.
 * TODO multi-line strings/comments aren't tracked across lines
 */

const KEYWORDS = new Set([
  "and",
  "break",
  "do",
  "else",
  "elseif",
  "end",
  "false",
  "for",
  "function",
  "goto",
  "if",
  "in",
  "local",
  "nil",
  "not",
  "or",
  "repeat",
  "return",
  "then",
  "true",
  "until",
  "while",
]);

export type TokenType = "keyword" | "string" | "comment" | "number" | "plain";

export interface Token {
  type: TokenType;
  text: string;
}

const TOKEN_PATTERN =
  /(--.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d+\.?\d*\b)|([A-Za-z_][A-Za-z0-9_]*)|(\s+)/g;

/** Tokenizes a single line of Lua source for highlighting; concatenating token text reproduces the line exactly. */
export function tokenizeLuaLine(line: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;
  TOKEN_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TOKEN_PATTERN.exec(line))) {
    if (match.index > lastIndex) {
      tokens.push({ type: "plain", text: line.slice(lastIndex, match.index) });
    }
    const [full, comment, str, num, word, ws] = match;
    if (comment !== undefined) tokens.push({ type: "comment", text: comment });
    else if (str !== undefined) tokens.push({ type: "string", text: str });
    else if (num !== undefined) tokens.push({ type: "number", text: num });
    else if (word !== undefined) tokens.push({ type: KEYWORDS.has(word) ? "keyword" : "plain", text: word });
    else tokens.push({ type: "plain", text: ws ?? full });
    lastIndex = match.index + full.length;
  }
  if (lastIndex < line.length) {
    tokens.push({ type: "plain", text: line.slice(lastIndex) });
  }
  return tokens;
}

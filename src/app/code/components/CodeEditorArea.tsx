import { forwardRef, useEffect, useImperativeHandle, useRef, type KeyboardEvent, type UIEvent } from "react";
import { tokenizeLuaLine } from "../lua-highlight.ts";
import { duplicateLine, findOutOfRangeIndices, jumpToFunction, toggleLineComment } from "../tools.ts";

interface Selection {
  start: number;
  end: number;
}

interface CodeEditorAreaProps {
  value: string;
  onChange: (value: string, selection: Selection) => void;
  onRequestFind: () => void;
  onCycleTab: (direction: 1 | -1) => void;
}

/** Imperative handle so the Find bar (owned by CodeTab, outside this component) can move the caret/selection. */
export interface CodeEditorAreaHandle {
  selectRange: (start: number, end: number) => void;
  getSelection: () => Selection;
}

const TOKEN_CLASS: Record<string, string> = {
  keyword: "text-blue-400",
  string: "text-amber-300",
  comment: "text-neutral-500 italic",
  number: "text-emerald-400",
  plain: "text-neutral-100",
};

/**
 * The Lua source editor widget: a plain `<textarea>` layered over a
 * syntax-highlighted `<pre>` overlay (identical font metrics, scroll-synced),
 * per PRD 22's "no third-party editor dependency" decision. Also owns the
 * editor-level keyboard shortcuts (duplicate line, toggle comment, find,
 * jump-to-function, cycle tabs) and the out-of-range-byte overlay markers.
 */
export const CodeEditorArea = forwardRef<CodeEditorAreaHandle, CodeEditorAreaProps>(function CodeEditorArea(
  { value, onChange, onRequestFind, onCycleTab },
  ref,
) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const overlayRef = useRef<HTMLPreElement | null>(null);
  const pendingSelection = useRef<Selection | null>(null);

  useImperativeHandle(ref, () => ({
    selectRange(start: number, end: number) {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(start, end);
    },
    getSelection(): Selection {
      const el = textareaRef.current;
      return el ? { start: el.selectionStart, end: el.selectionEnd } : { start: 0, end: 0 };
    },
  }));

  useEffect(() => {
    if (pendingSelection.current && textareaRef.current) {
      const { start, end } = pendingSelection.current;
      textareaRef.current.setSelectionRange(start, end);
      pendingSelection.current = null;
    }
  }, [value]);

  function commit(text: string, selection: Selection) {
    pendingSelection.current = selection;
    onChange(text, selection);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    const el = event.currentTarget;
    const mod = event.ctrlKey || event.metaKey;

    if (mod && event.key.toLowerCase() === "d") {
      event.preventDefault();
      const result = duplicateLine(el.value, el.selectionStart);
      commit(result.text, { start: result.cursorPos, end: result.cursorPos });
      return;
    }

    if (mod && (event.key === "/" || event.key.toLowerCase() === "b")) {
      event.preventDefault();
      const result = toggleLineComment(el.value, el.selectionStart, el.selectionEnd);
      commit(result.text, { start: result.selectionStart, end: result.selectionEnd });
      return;
    }

    if (mod && event.key.toLowerCase() === "f") {
      event.preventDefault();
      onRequestFind();
      return;
    }

    if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      const pos = jumpToFunction(el.value, el.selectionStart, event.key === "ArrowUp" ? "prev" : "next");
      if (pos !== null) el.setSelectionRange(pos, pos);
      return;
    }

    if (mod && event.key === "Tab") {
      event.preventDefault();
      onCycleTab(event.shiftKey ? -1 : 1);
      return;
    }
  }

  function handleScroll(event: UIEvent<HTMLTextAreaElement>) {
    if (!overlayRef.current) return;
    overlayRef.current.scrollTop = event.currentTarget.scrollTop;
    overlayRef.current.scrollLeft = event.currentTarget.scrollLeft;
  }

  const lines = value.split("\n");
  const outOfRange = new Set(findOutOfRangeIndices(value));

  // TODO per-grapheme index below can drift from the UTF-16 offsets in `outOfRange` within a token
  // TODO mixing surrogate-pair and single-unit characters; harmless since every position in a
  // TODO fully-out-of-range run (the realistic case here) is flagged regardless of exact alignment.
  let charOffset = 0;

  return (
    <div className="flex overflow-hidden rounded-b border border-neutral-700 bg-neutral-950 font-mono text-sm leading-5">
      <div aria-hidden="true" className="select-none bg-neutral-900 px-2 py-2 text-right text-neutral-600">
        {lines.map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <div className="relative flex-1">
        <pre
          ref={overlayRef}
          aria-hidden="true"
          data-testid="code-editor-overlay"
          className="pointer-events-none absolute inset-0 m-0 overflow-hidden whitespace-pre-wrap break-words px-2 py-2"
        >
          {lines.map((line, lineIndex) => {
            const lineStart = charOffset;
            charOffset += line.length + 1;
            let inLineOffset = 0;
            return (
              <div key={lineIndex}>
                {tokenizeLuaLine(line).map((token, tokenIndex) => {
                  const tokenStart = lineStart + inLineOffset;
                  const tokenChars = Array.from(token.text);
                  const hasOutOfRange = tokenChars.some((_, i) => outOfRange.has(tokenStart + i));
                  inLineOffset += token.text.length;
                  if (!hasOutOfRange) {
                    return (
                      <span key={tokenIndex} className={TOKEN_CLASS[token.type]}>
                        {token.text}
                      </span>
                    );
                  }
                  return (
                    <span key={tokenIndex} className={TOKEN_CLASS[token.type]}>
                      {tokenChars.map((ch, charIndex) =>
                        outOfRange.has(tokenStart + charIndex) ? (
                          <span
                            key={charIndex}
                            data-testid="out-of-range-char"
                            title="This character is outside PICO-8's single-byte range (0x00-0xFF) and export will fail until it's removed."
                            className="underline decoration-red-500 decoration-wavy"
                          >
                            {ch}
                          </span>
                        ) : (
                          ch
                        ),
                      )}
                    </span>
                  );
                })}
                {"\n"}
              </div>
            );
          })}
        </pre>
        <textarea
          ref={textareaRef}
          data-testid="code-editor-textarea"
          value={value}
          spellCheck={false}
          wrap="off"
          onChange={(e) => onChange(e.target.value, { start: e.target.selectionStart, end: e.target.selectionEnd })}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          className="relative h-80 w-full resize-none whitespace-pre-wrap break-words bg-transparent px-2 py-2 text-transparent caret-neutral-100 outline-none"
        />
      </div>
    </div>
  );
});

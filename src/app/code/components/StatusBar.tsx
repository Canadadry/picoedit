import { useEffect, useState } from "react";
import { encodeLua, MAX_COMPRESSED_LENGTH, MAX_DECOMPRESSED_LENGTH } from "../../../internal/pico8/cart-lua-encode.ts";
import { cn } from "../../lib/utils.ts";
import { COMPRESSED_SIZE_WARNING_RATIO, findOutOfRangeIndices } from "../tools.ts";

const DEBOUNCE_MS = 200;

interface StatusBarProps {
  /** The full, current, joined Lua source (`cart.lua`), not just the active tab's segment. */
  lua: string;
}

type EncodeFailure = "none" | "over-limit" | "invalid-char";

/**
 * Character-count and compressed-size indicators against the real ceilings
 * `encodeLua` enforces, computed on an idle debounce since compression isn't
 * free. Turns into a visible warning within COMPRESSED_SIZE_WARNING_RATIO of
 * the compressed-size ceiling, or if the source already exceeds it (encodeLua
 * throws on export in that case — caught here so the tab keeps rendering).
 * encodeLua also throws for an out-of-range (non 0x00-0xFF) character;
 * findOutOfRangeIndices (also used by CodeEditorArea's overlay) tells the two
 * failure causes apart so the message shown here doesn't misattribute an
 * invalid-character error to the compressed-size limit.
 */
export function StatusBar({ lua }: StatusBarProps) {
  const [compressedLength, setCompressedLength] = useState<number | null>(null);
  const [failure, setFailure] = useState<EncodeFailure>("none");

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        setCompressedLength(encodeLua(lua).length - 8);
        setFailure("none");
      } catch {
        setCompressedLength(null);
        setFailure(findOutOfRangeIndices(lua).length > 0 ? "invalid-char" : "over-limit");
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [lua]);

  const overLimit = failure === "over-limit";
  const invalidChar = failure === "invalid-char";
  const ratio = compressedLength === null ? 0 : compressedLength / MAX_COMPRESSED_LENGTH;
  const nearLimit = failure !== "none" || ratio >= COMPRESSED_SIZE_WARNING_RATIO;

  return (
    <div
      data-testid="code-status-bar"
      role="status"
      className={cn("flex flex-wrap gap-x-4 gap-y-1 text-xs", nearLimit ? "text-red-400" : "text-neutral-500")}
    >
      <span>
        {lua.length.toLocaleString()} / {MAX_DECOMPRESSED_LENGTH.toLocaleString()} chars
      </span>
      <span>
        {overLimit
          ? `> ${MAX_COMPRESSED_LENGTH.toLocaleString()}`
          : invalidChar
            ? "—"
            : (compressedLength?.toLocaleString() ?? "…")}{" "}
        / {MAX_COMPRESSED_LENGTH.toLocaleString()} bytes compressed
      </span>
      {overLimit && <span>Exceeds the compressed-size limit — export will fail until trimmed.</span>}
      {invalidChar && (
        <span>Contains a character outside PICO-8's single-byte range (0x00-0xFF) — export will fail until it's removed.</span>
      )}
      {!overLimit && !invalidChar && nearLimit && <span>Approaching the compressed-size limit.</span>}
    </div>
  );
}

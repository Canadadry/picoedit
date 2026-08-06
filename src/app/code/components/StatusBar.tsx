import { useEffect, useState } from "react";
import { encodeLua, MAX_COMPRESSED_LENGTH, MAX_DECOMPRESSED_LENGTH } from "../../../internal/pico8/cart-lua-encode.ts";
import { cn } from "../../lib/utils.ts";
import { COMPRESSED_SIZE_WARNING_RATIO } from "../tools.ts";

const DEBOUNCE_MS = 200;

interface StatusBarProps {
  /** The full, current, joined Lua source (`cart.lua`), not just the active tab's segment. */
  lua: string;
}

/**
 * Character-count and compressed-size indicators against the real ceilings
 * `encodeLua` enforces, computed on an idle debounce since compression isn't
 * free. Turns into a visible warning within COMPRESSED_SIZE_WARNING_RATIO of
 * the compressed-size ceiling, or if the source already exceeds it (encodeLua
 * throws on export in that case — caught here so the tab keeps rendering).
 */
export function StatusBar({ lua }: StatusBarProps) {
  const [compressedLength, setCompressedLength] = useState<number | null>(null);
  const [overLimit, setOverLimit] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        setCompressedLength(encodeLua(lua).length - 8);
        setOverLimit(false);
      } catch {
        setCompressedLength(null);
        setOverLimit(true);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [lua]);

  const ratio = compressedLength === null ? 0 : compressedLength / MAX_COMPRESSED_LENGTH;
  const nearLimit = overLimit || ratio >= COMPRESSED_SIZE_WARNING_RATIO;

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
          : (compressedLength?.toLocaleString() ?? "…")}{" "}
        / {MAX_COMPRESSED_LENGTH.toLocaleString()} bytes compressed
      </span>
      {overLimit && <span>Exceeds the compressed-size limit — export will fail until trimmed.</span>}
      {!overLimit && nearLimit && <span>Approaching the compressed-size limit.</span>}
    </div>
  );
}

import { cn } from "../../lib/utils.ts";
import type { Tool } from "../SpriteTab.tsx";

const TOOLS: { tool: Tool; label: string }[] = [
  { tool: "draw", label: "Draw" },
  { tool: "select", label: "Select" },
  { tool: "stamp", label: "Stamp" },
  { tool: "fill", label: "Fill" },
  { tool: "pan", label: "Pan" },
  { tool: "rect", label: "Rect" },
  { tool: "oval", label: "Oval" },
  { tool: "line", label: "Line" },
];

interface ToolbarProps {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  canCopy: boolean;
  canPaste: boolean;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
}

export function Toolbar({ tool, onToolChange, canCopy, canPaste, onCopy, onCut, onPaste }: ToolbarProps) {
  return (
    <div role="group" aria-label="Toolbar" className="flex flex-wrap gap-1">
      {TOOLS.map((entry) => (
        <button
          key={entry.tool}
          type="button"
          aria-label={entry.label}
          aria-pressed={tool === entry.tool}
          onClick={() => onToolChange(entry.tool)}
          className={cn(
            "rounded border px-2 py-1 text-sm",
            tool === entry.tool
              ? "border-blue-500 bg-blue-950/40 text-neutral-100"
              : "border-neutral-700 text-neutral-300 hover:bg-neutral-800",
          )}
        >
          {entry.label}
        </button>
      ))}
      <span className="mx-1 w-px self-stretch bg-neutral-700" aria-hidden="true" />
      <button
        type="button"
        aria-label="Copy"
        disabled={!canCopy}
        onClick={onCopy}
        className="rounded border border-neutral-700 px-2 py-1 text-sm text-neutral-300 hover:bg-neutral-800 disabled:opacity-40"
      >
        Copy
      </button>
      <button
        type="button"
        aria-label="Cut"
        disabled={!canCopy}
        onClick={onCut}
        className="rounded border border-neutral-700 px-2 py-1 text-sm text-neutral-300 hover:bg-neutral-800 disabled:opacity-40"
      >
        Cut
      </button>
      <button
        type="button"
        aria-label="Paste"
        disabled={!canPaste}
        onClick={onPaste}
        className="rounded border border-neutral-700 px-2 py-1 text-sm text-neutral-300 hover:bg-neutral-800 disabled:opacity-40"
      >
        Paste
      </button>
    </div>
  );
}

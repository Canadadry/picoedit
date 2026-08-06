import { cn } from "../../lib/utils.ts";
import type { MapTool } from "../MapTab.tsx";

const TOOLS: { tool: MapTool; label: string }[] = [
  { tool: "stamp", label: "Stamp" },
  { tool: "select", label: "Select" },
  { tool: "fill", label: "Fill" },
  { tool: "eyedrop", label: "Eyedrop" },
  { tool: "pan", label: "Pan" },
];

interface ToolbarProps {
  tool: MapTool;
  onToolChange: (tool: MapTool) => void;
  canCopy: boolean;
  onCopy: () => void;
  showIndices: boolean;
  onToggleIndices: () => void;
}

export function Toolbar({ tool, onToolChange, canCopy, onCopy, showIndices, onToggleIndices }: ToolbarProps) {
  return (
    <div role="group" aria-label="Map toolbar" className="flex flex-wrap gap-1">
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
      <span className="mx-1 w-px self-stretch bg-neutral-700" aria-hidden="true" />
      <button
        type="button"
        aria-label="Toggle sprite index overlay"
        aria-pressed={showIndices}
        onClick={onToggleIndices}
        className={cn(
          "rounded border px-2 py-1 text-sm",
          showIndices
            ? "border-blue-500 bg-blue-950/40 text-neutral-100"
            : "border-neutral-700 text-neutral-300 hover:bg-neutral-800",
        )}
      >
        # Indices
      </button>
    </div>
  );
}

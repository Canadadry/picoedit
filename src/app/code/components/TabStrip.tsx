import { cn } from "../../lib/utils.ts";
import { MAX_TABS } from "../tools.ts";

interface TabStripProps {
  segments: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

/** PICO-8-style horizontal strip of code tabs, one per `-->8`-delimited segment. */
export function TabStrip({ segments, activeIndex, onSelect, onAdd, onRemove }: TabStripProps) {
  return (
    <div role="tablist" aria-label="Code tabs" className="flex flex-wrap items-center gap-1">
      {segments.map((_, index) => (
        <div
          key={index}
          className={cn(
            "flex items-center gap-1 rounded-t border border-b-0 px-2 py-1 text-sm",
            index === activeIndex
              ? "border-blue-500 bg-blue-950/40 text-neutral-100"
              : "border-neutral-700 text-neutral-400 hover:bg-neutral-800",
          )}
        >
          <button
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            aria-label={`Tab ${index}`}
            onClick={() => onSelect(index)}
          >
            {index}
          </button>
          {segments.length > 1 && (
            <button
              type="button"
              aria-label={`Remove tab ${index}`}
              onClick={() => onRemove(index)}
              className="text-neutral-500 hover:text-neutral-200"
            >
              ×
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        aria-label="Add tab"
        disabled={segments.length >= MAX_TABS}
        onClick={onAdd}
        className="rounded border border-neutral-700 px-2 py-1 text-sm text-neutral-300 hover:bg-neutral-800 disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

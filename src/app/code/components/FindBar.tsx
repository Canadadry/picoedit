import type { ChangeEvent, KeyboardEvent } from "react";

interface FindBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  onFindNext: () => void;
  onClose: () => void;
}

/** Ctrl/Cmd+F opens this in-page find bar — browser-native find is intercepted since this isn't a real page. */
export function FindBar({ query, onQueryChange, onFindNext, onClose }: FindBarProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onQueryChange(event.target.value);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onFindNext();
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  }

  return (
    <div className="flex items-center gap-2 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm">
      <input
        type="text"
        aria-label="Find"
        autoFocus
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="flex-1 bg-transparent text-neutral-100 outline-none"
        placeholder="Find in current tab…"
      />
      <button
        type="button"
        aria-label="Find next"
        onClick={onFindNext}
        className="rounded border border-neutral-700 px-2 py-0.5 text-neutral-300 hover:bg-neutral-800"
      >
        Next
      </button>
      <button
        type="button"
        aria-label="Close find"
        onClick={onClose}
        className="rounded border border-neutral-700 px-2 py-0.5 text-neutral-300 hover:bg-neutral-800"
      >
        ×
      </button>
    </div>
  );
}

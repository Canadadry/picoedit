import { useRef, useState } from "react";
import { useCart } from "../state/CartContext.tsx";
import { CodeEditorArea, type CodeEditorAreaHandle } from "./components/CodeEditorArea.tsx";
import { FindBar } from "./components/FindBar.tsx";
import { StatusBar } from "./components/StatusBar.tsx";
import { TabStrip } from "./components/TabStrip.tsx";
import { findNextMatch, joinTabs, MAX_TABS, splitIntoTabs } from "./tools.ts";

export function CodeTab() {
  const { cart, updateCart } = useCart();
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const editorRef = useRef<CodeEditorAreaHandle>(null);

  if (!cart) {
    return <p className="text-sm text-neutral-400">Load a cart in the File tab first.</p>;
  }

  const segments = splitIntoTabs(cart.lua);
  const clampedIndex = Math.min(activeTabIndex, segments.length - 1);

  function replaceSegments(newSegments: string[]) {
    updateCart({ lua: joinTabs(newSegments) });
  }

  function handleSegmentChange(newText: string) {
    const newSegments = segments.slice();
    newSegments[clampedIndex] = newText;
    replaceSegments(newSegments);
  }

  function handleAddTab() {
    if (segments.length >= MAX_TABS) return;
    replaceSegments([...segments, ""]);
    setActiveTabIndex(segments.length);
  }

  function handleRemoveTab(index: number) {
    if (segments.length <= 1) return;
    const newSegments = segments.slice(0, index).concat(segments.slice(index + 1));
    replaceSegments(newSegments);
    setActiveTabIndex((current) => Math.max(0, Math.min(current, newSegments.length - 1)));
  }

  function handleCycleTab(direction: 1 | -1) {
    setActiveTabIndex((current) => (current + direction + segments.length) % segments.length);
  }

  function handleFindNext() {
    const activeText = segments[clampedIndex] ?? "";
    const selection = editorRef.current?.getSelection() ?? { start: 0, end: 0 };
    const pos = findNextMatch(activeText, findQuery, selection.end);
    if (pos !== null) {
      editorRef.current?.selectRange(pos, pos + findQuery.length);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <TabStrip
        segments={segments}
        activeIndex={clampedIndex}
        onSelect={setActiveTabIndex}
        onAdd={handleAddTab}
        onRemove={handleRemoveTab}
      />
      {findOpen && (
        <FindBar
          query={findQuery}
          onQueryChange={setFindQuery}
          onFindNext={handleFindNext}
          onClose={() => setFindOpen(false)}
        />
      )}
      <CodeEditorArea
        ref={editorRef}
        value={segments[clampedIndex] ?? ""}
        onChange={(text) => handleSegmentChange(text)}
        onRequestFind={() => setFindOpen(true)}
        onCycleTab={handleCycleTab}
      />
      <StatusBar lua={cart.lua} />
    </div>
  );
}

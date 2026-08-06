import { useState } from "react";
import { useCart } from "../state/CartContext.tsx";
import { withToggledFlag } from "./flags.ts";
import { GffGrid } from "./components/GffGrid.tsx";
import { GffDetailPanel } from "./components/GffDetailPanel.tsx";

export function GffTab() {
  const { cart, updateCart } = useCart();
  const [selectedSprite, setSelectedSprite] = useState<number | null>(null);

  if (!cart) {
    return <p className="text-sm text-neutral-400">Load a cart in the File tab first.</p>;
  }

  function toggleFlag(spriteIndex: number, flagIndex: number) {
    if (!cart) return;
    const gff = cart.gff.slice();
    gff[spriteIndex] = withToggledFlag(gff[spriteIndex]!, flagIndex);
    updateCart({ gff });
  }

  return (
    <div className="flex flex-wrap items-start gap-4">
      <GffGrid
        sheet={cart.gfx}
        flagsBySprite={cart.gff}
        selectedSprite={selectedSprite}
        onSelectSprite={setSelectedSprite}
        onToggleFlag={toggleFlag}
      />
      {selectedSprite === null ? (
        <p className="text-sm text-neutral-400">Click a sprite thumbnail to edit its flags.</p>
      ) : (
        <GffDetailPanel
          spriteIndex={selectedSprite}
          flags={cart.gff[selectedSprite]!}
          onToggleFlag={(flagIndex) => toggleFlag(selectedSprite, flagIndex)}
        />
      )}
    </div>
  );
}

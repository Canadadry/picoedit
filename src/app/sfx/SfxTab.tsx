import { useState } from "react";
import type { Note, Sfx } from "../../internal/pico8/cart-data.ts";
import { useCart } from "../state/CartContext.tsx";
import { SfxMetadata } from "./components/SfxMetadata.tsx";
import { SfxNoteGrid } from "./components/SfxNoteGrid.tsx";
import { SfxSlotList } from "./components/SfxSlotList.tsx";
import { withEditedMetadata, withEditedNote } from "./tools.ts";

type SfxMetadataPatch = Partial<Pick<Sfx, "speed" | "loopStart" | "loopEnd" | "editorMode">>;

export function SfxTab() {
  const { cart, updateCart } = useCart();
  const [selectedSlot, setSelectedSlot] = useState(0);

  if (!cart) {
    return <p className="text-sm text-neutral-400">Load a cart in the File tab first.</p>;
  }

  function editSlot(edit: (sfx: Sfx) => Sfx) {
    if (!cart) return;
    const sfx = cart.sfx.slice();
    sfx[selectedSlot] = edit(sfx[selectedSlot]!);
    updateCart({ sfx });
  }

  function editNote(noteIndex: number, patch: Partial<Note>) {
    editSlot((sfx) => withEditedNote(sfx, noteIndex, patch));
  }

  function editMetadata(patch: SfxMetadataPatch) {
    editSlot((sfx) => withEditedMetadata(sfx, patch));
  }

  const selectedSfx = cart.sfx[selectedSlot]!;

  return (
    <div className="flex flex-wrap items-start gap-4">
      <SfxSlotList selectedSlot={selectedSlot} onSelectSlot={setSelectedSlot} />
      <div className="flex flex-col gap-4">
        <SfxMetadata sfx={selectedSfx} onEditMetadata={editMetadata} />
        <SfxNoteGrid notes={selectedSfx.notes} onEditNote={editNote} />
      </div>
    </div>
  );
}

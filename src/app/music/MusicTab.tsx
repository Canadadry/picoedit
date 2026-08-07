import type { PatternChannel } from "../../internal/pico8/cart-data.ts";
import { useCart } from "../state/CartContext.tsx";
import { PatternRow } from "./components/PatternRow.tsx";
import { withEditedChannel } from "./tools.ts";

const PATTERN_COUNT = 64;

/** All 64 CartData.music patterns as a vertically scrollable list of rows (see docs/prd/triage/24-app-music-editor.md). */
export function MusicTab() {
  const { cart, updateCart } = useCart();

  if (!cart) {
    return <p className="text-sm text-neutral-400">Load a cart in the File tab first.</p>;
  }

  function editChannel(patternIndex: number, channelIndex: number, patch: Partial<PatternChannel>) {
    if (!cart) return;
    const music = cart.music.slice();
    music[patternIndex] = withEditedChannel(music[patternIndex]!, channelIndex, patch);
    updateCart({ music });
  }

  const patternIndices = Array.from({ length: PATTERN_COUNT }, (_, i) => i);

  return (
    <div className="max-h-[80vh] overflow-auto">
      <table aria-label="Music pattern list" className="border-collapse text-xs">
        <thead>
          <tr className="text-left text-neutral-400">
            <th className="px-1 font-normal">#</th>
            <th className="px-1 font-normal" colSpan={4}>
              Channels
            </th>
            <th className="px-1 font-normal" colSpan={3}>
              Loop
            </th>
          </tr>
        </thead>
        <tbody>
          {patternIndices.map((patternIndex) => (
            <PatternRow
              key={patternIndex}
              patternIndex={patternIndex}
              pattern={cart.music[patternIndex]!}
              onEditChannel={(channelIndex, patch) => editChannel(patternIndex, channelIndex, patch)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

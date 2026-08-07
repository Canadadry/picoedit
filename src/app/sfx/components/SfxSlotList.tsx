import { cn } from "../../lib/utils.ts";

const SLOT_COUNT = 64;
const GRID_COLUMNS = 8;

interface SfxSlotListProps {
  selectedSlot: number;
  onSelectSlot: (slotIndex: number) => void;
}

/** An 8x8 grid of the 64 sfx slots, numbered 00-63 matching PICO-8's own numbering. */
export function SfxSlotList({ selectedSlot, onSelectSlot }: SfxSlotListProps) {
  const indices = Array.from({ length: SLOT_COUNT }, (_, i) => i);
  return (
    <div
      role="group"
      aria-label="Sfx slots"
      className="grid gap-px"
      style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS}, max-content)` }}
    >
      {indices.map((slotIndex) => (
        <button
          key={slotIndex}
          type="button"
          aria-label={`Sfx slot ${slotIndex}`}
          aria-pressed={slotIndex === selectedSlot}
          onClick={() => onSelectSlot(slotIndex)}
          className={cn(
            "h-8 w-8 rounded border text-xs",
            slotIndex === selectedSlot
              ? "border-blue-500 bg-blue-950/40 text-neutral-100"
              : "border-neutral-700 text-neutral-300 hover:bg-neutral-800",
          )}
        >
          {String(slotIndex).padStart(2, "0")}
        </button>
      ))}
    </div>
  );
}

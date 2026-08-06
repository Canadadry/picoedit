import type { SpriteFlags } from "../../internal/pico8/cart-data.ts";
import { PICO8_PALETTE, type Rgb } from "../../internal/pico8/palette.ts";

/** flag0..flag7 in bit order, matching `SpriteFlags`. */
export const FLAG_KEYS: readonly (keyof SpriteFlags)[] = [
  "flag0",
  "flag1",
  "flag2",
  "flag3",
  "flag4",
  "flag5",
  "flag6",
  "flag7",
];

/**
 * Cosmetic-only colors for the 8 flag toggles, reusing PICO8_PALETTE indices
 * 8-15 (in flag 0-7 order) as PICO-8's fixed colored-dot UI convention.
 * `SpriteFlags` itself has no color field: this is UI-only, not data.
 */
export const FLAG_COLORS: readonly Rgb[] = PICO8_PALETTE.slice(8, 16);

export function withToggledFlag(flags: SpriteFlags, flagIndex: number): SpriteFlags {
  const key = FLAG_KEYS[flagIndex];
  if (!key) {
    throw new Error(`flag index out of range: ${flagIndex}`);
  }
  return { ...flags, [key]: !flags[key] };
}

import type { MusicPattern } from "../../internal/pico8/cart-data.ts";
import { LOOP_END_CHANNEL, LOOP_START_CHANNEL, STOP_CHANNEL, withEditedChannel } from "./tools.ts";

function makePattern(): MusicPattern {
  return [
    { sfxId: 1, mute: true, flag: true },
    { sfxId: 2, mute: false, flag: false },
    { sfxId: 3, mute: false, flag: false },
    { sfxId: 4, mute: false, flag: false },
  ];
}

test("LOOP_START_CHANNEL/LOOP_END_CHANNEL/STOP_CHANNEL map to bytes 0/1/2 per docs/spec.md §8.4", () => {
  expect(LOOP_START_CHANNEL).toBe(0);
  expect(LOOP_END_CHANNEL).toBe(1);
  expect(STOP_CHANNEL).toBe(2);
});

test("withEditedChannel replaces only the targeted channel's patched fields, leaving other channels untouched", () => {
  const pattern = makePattern();
  const edited = withEditedChannel(pattern, 1, { sfxId: 42 });

  expect(edited[1]).toEqual({ sfxId: 42, mute: false, flag: false });
  expect(edited[0]).toEqual(pattern[0]);
  expect(edited[2]).toEqual(pattern[2]);
  expect(edited[3]).toEqual(pattern[3]);
  expect(pattern[1]).toEqual({ sfxId: 2, mute: false, flag: false });
});

test("withEditedChannel throws on an out-of-range channel index instead of silently ignoring it", () => {
  const pattern = makePattern();
  expect(() => withEditedChannel(pattern, 4, { sfxId: 1 })).toThrow();
});

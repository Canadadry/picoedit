import { test } from "node:test";
import assert from "node:assert/strict";
import { isValid } from "./cart-data.ts";
import type {
  CartData,
  MusicPattern,
  Note,
  PatternChannel,
  Sfx,
  SpriteFlags,
  SpriteSheet,
} from "./cart-data.ts";

function makeSpriteSheet(): SpriteSheet {
  return { width: 128, height: 128, pixels: Array.from({ length: 128 * 128 }, () => 0) };
}

function makeSpriteFlags(): SpriteFlags {
  return {
    flag0: false,
    flag1: false,
    flag2: false,
    flag3: false,
    flag4: false,
    flag5: false,
    flag6: false,
    flag7: false,
  };
}

function makeNote(): Note {
  return { pitch: 0, instrument: 0, volume: 0, effect: "none" };
}

function makeSfx(): Sfx {
  return {
    notes: Array.from({ length: 32 }, makeNote),
    editorMode: 0,
    speed: 16,
    loopStart: 0,
    loopEnd: 0,
  };
}

function makePatternChannel(): PatternChannel {
  return { sfxId: 0, mute: false, flag: false };
}

function makeMusicPattern(): MusicPattern {
  return [
    makePatternChannel(),
    makePatternChannel(),
    makePatternChannel(),
    makePatternChannel(),
  ];
}

function makeValidCart(): CartData {
  return {
    lua: "",
    gfx: makeSpriteSheet(),
    gff: Array.from({ length: 256 }, makeSpriteFlags),
    map: {},
    sfx: Array.from({ length: 64 }, makeSfx),
    music: Array.from({ length: 64 }, makeMusicPattern),
    label: {},
  };
}

test("isValid", async (t) => {
  await t.test("returns true for a fully valid CartData", () => {
    assert.equal(isValid(makeValidCart()), true);
  });

  await t.test("returns false when gff has the wrong length", () => {
    const cart = makeValidCart();
    cart.gff.pop();
    assert.equal(isValid(cart), false);
  });

  await t.test("returns false when sfx has the wrong length", () => {
    const cart = makeValidCart();
    cart.sfx.pop();
    assert.equal(isValid(cart), false);
  });

  await t.test(
    "returns false when a Sfx's notes has the wrong length",
    () => {
      const cart = makeValidCart();
      cart.sfx[0]!.notes.pop();
      assert.equal(isValid(cart), false);
    },
  );

  await t.test("returns false when music has the wrong length", () => {
    const cart = makeValidCart();
    cart.music.pop();
    assert.equal(isValid(cart), false);
  });

  await t.test("returns false when a Note's pitch is out of range", () => {
    const cart = makeValidCart();
    cart.sfx[0]!.notes[0]!.pitch = 64 as unknown as Note["pitch"];
    assert.equal(isValid(cart), false);
  });

  await t.test(
    "returns false when a Note's instrument is out of range",
    () => {
      const cart = makeValidCart();
      cart.sfx[0]!.notes[0]!.instrument = 16 as unknown as Note["instrument"];
      assert.equal(isValid(cart), false);
    },
  );

  await t.test("returns false when a Note's volume is out of range", () => {
    const cart = makeValidCart();
    cart.sfx[0]!.notes[0]!.volume = 8 as unknown as Note["volume"];
    assert.equal(isValid(cart), false);
  });

  await t.test(
    "returns false when a PatternChannel's sfxId is out of range",
    () => {
      const cart = makeValidCart();
      cart.music[0]![0]!.sfxId = 64 as unknown as PatternChannel["sfxId"];
      assert.equal(isValid(cart), false);
    },
  );
});

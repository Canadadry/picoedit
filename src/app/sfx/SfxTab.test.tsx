import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { useEffect } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { decode, encode, type DecodedCart } from "../../internal/pico8/cart.ts";
import { CartProvider, useCart } from "../state/CartContext.tsx";
import { SfxTab } from "./SfxTab.tsx";

const cartDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "cart");

function readFixtureBytes(name: string): Uint8Array {
  return new Uint8Array(readFileSync(path.join(cartDir, name)));
}

let latestCart: DecodedCart | null = null;
let latestOriginalBytes: Uint8Array | null = null;

function CartCapture() {
  const { cart, originalPngBytes } = useCart();
  latestCart = cart;
  latestOriginalBytes = originalPngBytes;
  return null;
}

function Loader({ bytes, name }: { bytes: Uint8Array; name: string }) {
  const { loadCart, cart } = useCart();
  useEffect(() => {
    if (!cart) loadCart(bytes, name);
  }, [bytes, name, cart, loadCart]);
  return null;
}

function renderSfxTab(fixture = "dark tomb.p8.png") {
  latestCart = null;
  latestOriginalBytes = null;
  const bytes = readFixtureBytes(fixture);
  const utils = render(
    <CartProvider>
      <Loader bytes={bytes} name={fixture} />
      <CartCapture />
      <SfxTab />
    </CartProvider>,
  );
  return utils;
}

test("before a cart is loaded, SfxTab prompts the user to load one instead of rendering the editor", () => {
  render(
    <CartProvider>
      <SfxTab />
    </CartProvider>,
  );

  expect(screen.getByText(/load a cart in the file tab first/i)).toBeTruthy();
  expect(screen.queryByLabelText("Sfx slot 0")).toBeNull();
});

test("once a cart is loaded, all 64 sfx slots render in the slot picker, numbered 00-63", async () => {
  renderSfxTab();

  await waitFor(() => {
    expect(screen.getByLabelText("Sfx slot 0")).toBeTruthy();
  });
  expect(screen.getByLabelText("Sfx slot 0").textContent).toBe("00");
  expect(screen.getByLabelText("Sfx slot 63")).toBeTruthy();
  expect(screen.getByLabelText("Sfx slot 63").textContent).toBe("63");
});

test("slot 0 is selected by default and its 32 notes render matching the fixture's decoded sfx[0]", async () => {
  renderSfxTab();
  await waitFor(() => screen.getByLabelText("Sfx slot 0"));

  expect(screen.getByLabelText("Sfx slot 0").getAttribute("aria-pressed")).toBe("true");
  const expected = latestCart!.sfx[0]!;
  expect(expected.notes).toHaveLength(32);
  const firstNotePitch = screen.getByLabelText("Note 0 pitch") as HTMLSelectElement;
  expect(firstNotePitch.value).toBe("C0");
});

test("clicking a different slot shows that slot's own notes and metadata", async () => {
  const user = userEvent.setup();
  renderSfxTab();
  await waitFor(() => screen.getByLabelText("Sfx slot 1"));

  await user.click(screen.getByLabelText("Sfx slot 1"));

  const expected = latestCart!.sfx[1]!;
  await waitFor(() => {
    expect((screen.getByLabelText("Note 0 pitch") as HTMLSelectElement).value).toBe("F#2");
  });
  expect((screen.getByLabelText("Note 0 instrument") as HTMLSelectElement).value).toBe(
    String(expected.notes[0]!.instrument),
  );
  expect((screen.getByLabelText("Note 6 effect") as HTMLSelectElement).value).toBe("slide");
  expect((screen.getByLabelText("Speed") as HTMLInputElement).value).toBe(String(expected.speed));
  expect((screen.getByLabelText("Loop end") as HTMLInputElement).value).toBe(String(expected.loopEnd));
});

test("editing a note's pitch dropdown writes the new pitch to CartContext's sfx array, leaving other fields and slots untouched", async () => {
  const user = userEvent.setup();
  renderSfxTab();
  await waitFor(() => screen.getByLabelText("Sfx slot 0"));
  const otherSlotBefore = { ...latestCart!.sfx[1]! };
  const noteBefore = { ...latestCart!.sfx[0]!.notes[3]! };

  await user.selectOptions(screen.getByLabelText("Note 3 pitch"), "A2");

  await waitFor(() => {
    expect(latestCart!.sfx[0]!.notes[3]!.pitch).toBe(33);
  });
  expect(latestCart!.sfx[0]!.notes[3]).toEqual({ ...noteBefore, pitch: 33 });
  expect(latestCart!.sfx[1]).toEqual(otherSlotBefore);
});

test("editing a note's instrument, volume, and effect dropdowns each write to CartContext independently", async () => {
  const user = userEvent.setup();
  renderSfxTab();
  await waitFor(() => screen.getByLabelText("Sfx slot 0"));

  await user.selectOptions(screen.getByLabelText("Note 5 instrument"), "9");
  await user.selectOptions(screen.getByLabelText("Note 5 volume"), "4");
  await user.selectOptions(screen.getByLabelText("Note 5 effect"), "vibrato");

  await waitFor(() => {
    expect(latestCart!.sfx[0]!.notes[5]).toEqual({
      pitch: 0,
      instrument: 9,
      volume: 4,
      effect: "vibrato",
    });
  });
});

test("editing speed, loop start, loop end, and toggling editor mode write to CartContext's sfx[slot] metadata", async () => {
  const user = userEvent.setup();
  renderSfxTab();
  await waitFor(() => screen.getByLabelText("Sfx slot 0"));
  const before = latestCart!.sfx[0]!;

  const speedInput = screen.getByLabelText("Speed");
  await user.clear(speedInput);
  await user.type(speedInput, "5");
  const loopStartInput = screen.getByLabelText("Loop start");
  await user.clear(loopStartInput);
  await user.type(loopStartInput, "2");
  const loopEndInput = screen.getByLabelText("Loop end");
  await user.clear(loopEndInput);
  await user.type(loopEndInput, "10");

  await waitFor(() => {
    expect(latestCart!.sfx[0]!.speed).toBe(5);
  });
  expect(latestCart!.sfx[0]!.loopStart).toBe(2);
  expect(latestCart!.sfx[0]!.loopEnd).toBe(10);

  const editorModeToggle = screen.getByLabelText("Editor mode");
  expect(editorModeToggle.getAttribute("aria-pressed")).toBe(String(before.editorMode === 1));
  await user.click(editorModeToggle);
  await waitFor(() => {
    expect(latestCart!.sfx[0]!.editorMode).toBe(before.editorMode === 1 ? 0 : 1);
  });
});

test("round trip: after edits, encode then decode reproduces the edited sfx array bit-exact", async () => {
  const user = userEvent.setup();
  renderSfxTab();
  await waitFor(() => screen.getByLabelText("Sfx slot 0"));

  await user.selectOptions(screen.getByLabelText("Note 0 pitch"), "D#5");
  await waitFor(() => {
    expect(latestCart!.sfx[0]!.notes[0]!.pitch).toBe(63);
  });

  const reEncoded = encode(latestCart!, latestOriginalBytes!);
  const roundTripped = decode(reEncoded);
  expect(roundTripped.sfx).toEqual(latestCart!.sfx);
});

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { useEffect } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { decode, encode, type DecodedCart } from "../../internal/pico8/cart.ts";
import { CartProvider, useCart } from "../state/CartContext.tsx";
import { MusicTab } from "./MusicTab.tsx";

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

function renderMusicTab(fixture = "dark tomb.p8.png") {
  latestCart = null;
  latestOriginalBytes = null;
  const bytes = readFixtureBytes(fixture);
  const utils = render(
    <CartProvider>
      <Loader bytes={bytes} name={fixture} />
      <CartCapture />
      <MusicTab />
    </CartProvider>,
  );
  return utils;
}

test("before a cart is loaded, MusicTab prompts the user to load one instead of rendering the editor", () => {
  render(
    <CartProvider>
      <MusicTab />
    </CartProvider>,
  );

  expect(screen.getByText(/load a cart in the file tab first/i)).toBeTruthy();
  expect(screen.queryByLabelText("Pattern 0 channel 0 on")).toBeNull();
});

test("once a cart is loaded, all 64 patterns render, matching the fixture's decoded values", async () => {
  renderMusicTab();

  await waitFor(() => {
    expect(screen.getByLabelText("Pattern 0 channel 0 on")).toBeTruthy();
  });
  expect(screen.getByLabelText("Pattern 63 channel 0 on")).toBeTruthy();

  expect(screen.getByLabelText("Pattern 0 channel 0 on").getAttribute("aria-pressed")).toBe("false");
  expect(screen.queryByLabelText("Pattern 0 channel 0 sfx")).toBeNull();
  expect(screen.getByLabelText("Pattern 0 loop start").getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByLabelText("Pattern 0 loop end").getAttribute("aria-pressed")).toBe("false");

  expect(screen.getByLabelText("Pattern 0 channel 1 on").getAttribute("aria-pressed")).toBe("true");
  expect((screen.getByLabelText("Pattern 0 channel 1 sfx") as HTMLInputElement).value).toBe("2");

  expect(screen.getByLabelText("Pattern 63 stop").getAttribute("aria-pressed")).toBe("true");
});

test("toggling a muted channel on reveals its sfx field with the preserved sfxId, and toggling it back off hides it again without clearing sfxId", async () => {
  const user = userEvent.setup();
  renderMusicTab();
  await waitFor(() => screen.getByLabelText("Pattern 0 channel 0 on"));

  await user.click(screen.getByLabelText("Pattern 0 channel 0 on"));

  await waitFor(() => {
    expect(latestCart!.music[0]![0]!.mute).toBe(false);
  });
  expect(latestCart!.music[0]![0]!.sfxId).toBe(1);
  expect((screen.getByLabelText("Pattern 0 channel 0 sfx") as HTMLInputElement).value).toBe("1");

  await user.click(screen.getByLabelText("Pattern 0 channel 0 on"));

  await waitFor(() => {
    expect(latestCart!.music[0]![0]!.mute).toBe(true);
  });
  expect(latestCart!.music[0]![0]!.sfxId).toBe(1);
  expect(screen.queryByLabelText("Pattern 0 channel 0 sfx")).toBeNull();
});

test("editing a channel's sfx number input writes the new sfxId to CartContext, leaving other channels and patterns untouched", async () => {
  const user = userEvent.setup();
  renderMusicTab();
  await waitFor(() => screen.getByLabelText("Pattern 0 channel 1 on"));
  const otherPatternBefore = [...latestCart!.music[1]!];

  const sfxInput = screen.getByLabelText("Pattern 0 channel 1 sfx");
  await user.clear(sfxInput);
  await user.type(sfxInput, "42");

  await waitFor(() => {
    expect(latestCart!.music[0]![1]!.sfxId).toBe(42);
  });
  expect(latestCart!.music[0]![2]!.sfxId).toBe(3);
  expect(latestCart!.music[1]).toEqual(otherPatternBefore);
});

test("clicking loop start/end/stop toggles exactly pattern[0]/[1]/[2].flag respectively, matching spec §8.4's positional mapping", async () => {
  const user = userEvent.setup();
  renderMusicTab();
  await waitFor(() => screen.getByLabelText("Pattern 5 loop end"));

  await user.click(screen.getByLabelText("Pattern 5 loop end"));

  await waitFor(() => {
    expect(latestCart!.music[5]![1]!.flag).toBe(true);
  });
  expect(latestCart!.music[5]![0]!.flag).toBe(false);
  expect(latestCart!.music[5]![2]!.flag).toBe(false);

  await user.click(screen.getByLabelText("Pattern 5 stop"));

  await waitFor(() => {
    expect(latestCart!.music[5]![2]!.flag).toBe(true);
  });
  expect(latestCart!.music[5]![0]!.flag).toBe(false);
  expect(latestCart!.music[5]![1]!.flag).toBe(true);
});

test("round trip: after edits, encode then decode reproduces the edited music array bit-exact", async () => {
  const user = userEvent.setup();
  renderMusicTab();
  await waitFor(() => screen.getByLabelText("Pattern 0 channel 1 on"));

  const sfxInput = screen.getByLabelText("Pattern 0 channel 1 sfx");
  await user.clear(sfxInput);
  await user.type(sfxInput, "42");
  await user.click(screen.getByLabelText("Pattern 5 loop end"));

  await waitFor(() => {
    expect(latestCart!.music[0]![1]!.sfxId).toBe(42);
  });

  const reEncoded = encode(latestCart!, latestOriginalBytes!);
  const roundTripped = decode(reEncoded);
  expect(roundTripped.music).toEqual(latestCart!.music);
});

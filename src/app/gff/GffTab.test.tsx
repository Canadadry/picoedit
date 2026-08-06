import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { useEffect } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CartBytes } from "../../internal/pico8/cart-bytes.ts";
import { decodeGff, encodeGff, GFF_OFFSET } from "../../internal/pico8/cart-gff.ts";
import type { DecodedCart } from "../../internal/pico8/cart.ts";
import { CartProvider, useCart } from "../state/CartContext.tsx";
import { GffTab } from "./GffTab.tsx";

const cartDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "cart");

function readFixtureBytes(name: string): Uint8Array {
  return new Uint8Array(readFileSync(path.join(cartDir, name)));
}

let latestCart: DecodedCart | null = null;

function CartCapture() {
  const { cart } = useCart();
  latestCart = cart;
  return null;
}

function Loader({ bytes, name }: { bytes: Uint8Array; name: string }) {
  const { loadCart, cart } = useCart();
  useEffect(() => {
    if (!cart) loadCart(bytes, name);
  }, [bytes, name, cart, loadCart]);
  return null;
}

function renderGffTab(fixture = "dark tomb.p8.png") {
  latestCart = null;
  const bytes = readFixtureBytes(fixture);
  const utils = render(
    <CartProvider>
      <Loader bytes={bytes} name={fixture} />
      <CartCapture />
      <GffTab />
    </CartProvider>,
  );
  return utils;
}

test("before a cart is loaded, GffTab prompts the user to load one instead of rendering the grid", () => {
  render(
    <CartProvider>
      <GffTab />
    </CartProvider>,
  );

  expect(screen.getByText(/load a cart in the file tab first/i)).toBeTruthy();
  expect(screen.queryByLabelText("Sprite 0")).toBeNull();
});

test("once a cart is loaded, all 256 sprite thumbnails render in the grid", async () => {
  renderGffTab();

  await waitFor(() => {
    expect(screen.getByLabelText("Sprite 0")).toBeTruthy();
  });
  expect(screen.getByLabelText("Sprite 255")).toBeTruthy();
});

test("toggling a flag in the detail panel writes the new value to cart.gff[index] in CartContext", async () => {
  const user = userEvent.setup();
  renderGffTab();
  await waitFor(() => screen.getByLabelText("Sprite 3"));
  await user.click(screen.getByLabelText("Sprite 3"));
  const before = { ...latestCart!.gff[3]! };
  const sprite4Before = { ...latestCart!.gff[4]! };

  await user.click(screen.getByLabelText("Flag 2"));

  await waitFor(() => {
    expect(latestCart!.gff[3]!.flag2).toBe(!before.flag2);
  });
  expect(latestCart!.gff[3]).toEqual({ ...before, flag2: !before.flag2 });
  expect(latestCart!.gff[4]).toEqual(sprite4Before);
});

test("toggling a flag directly from the grid's per-thumbnail dots writes cart.gff[index] without needing the detail panel open", async () => {
  const user = userEvent.setup();
  renderGffTab();
  await waitFor(() => screen.getByLabelText("Sprite 5 flag 4"));
  const before = latestCart!.gff[5]!.flag4;

  await user.click(screen.getByLabelText("Sprite 5 flag 4"));

  await waitFor(() => {
    expect(latestCart!.gff[5]!.flag4).toBe(!before);
  });
});

test("round trip: encodeGff(decodeGff-equivalent) of the edited cart.gff is bit-exact after a grid toggle", async () => {
  const user = userEvent.setup();
  renderGffTab();
  await waitFor(() => screen.getByLabelText("Sprite 9 flag 7"));
  const before = latestCart!.gff[9]!.flag7;

  await user.click(screen.getByLabelText("Sprite 9 flag 7"));
  await waitFor(() => {
    expect(latestCart!.gff[9]!.flag7).toBe(!before);
  });

  const cartBytesLength = 160 * 205;
  const bytes = new Uint8Array(cartBytesLength) as CartBytes;
  bytes.set(encodeGff(latestCart!.gff), GFF_OFFSET);
  const roundTripped = decodeGff(bytes);
  expect(roundTripped).toEqual(latestCart!.gff);
});

test("clicking a sprite thumbnail opens a detail panel with 8 labeled flag toggles matching its current state", async () => {
  const user = userEvent.setup();
  renderGffTab();
  await waitFor(() => screen.getByLabelText("Sprite 3"));

  await user.click(screen.getByLabelText("Sprite 3"));

  const panel = screen.getByRole("group", { name: "Sprite 3 flags" });
  const expectedFlags = latestCart!.gff[3]!;
  for (let i = 0; i < 8; i++) {
    const toggle = screen.getByLabelText(`Flag ${i}`);
    expect(panel.contains(toggle)).toBe(true);
    expect(toggle.getAttribute("aria-pressed")).toBe(
      String(expectedFlags[`flag${i}` as keyof typeof expectedFlags]),
    );
  }
});

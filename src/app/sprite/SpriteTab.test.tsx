import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { useEffect } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DecodedCart } from "../../internal/pico8/cart.ts";
import { CartProvider, useCart } from "../state/CartContext.tsx";
import { pixelIndex } from "../state/shared-sprite-region.ts";
import { SpriteTab } from "./SpriteTab.tsx";

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

function renderSpriteTab(fixture = "dark tomb.p8.png") {
  latestCart = null;
  const bytes = readFixtureBytes(fixture);
  const utils = render(
    <CartProvider>
      <Loader bytes={bytes} name={fixture} />
      <CartCapture />
      <SpriteTab />
    </CartProvider>,
  );
  return utils;
}

const ZOOM = 4;

function mockCanvasRect(canvas: HTMLCanvasElement) {
  Object.defineProperty(canvas, "getBoundingClientRect", {
    configurable: true,
    value: () => ({
      left: 0,
      top: 0,
      right: 128 * ZOOM,
      bottom: 128 * ZOOM,
      width: 128 * ZOOM,
      height: 128 * ZOOM,
      x: 0,
      y: 0,
      toJSON() {
        return {};
      },
    }),
  });
}

async function getReadyCanvas(): Promise<HTMLCanvasElement> {
  const canvas = await waitFor(() => screen.getByTestId("sprite-canvas") as HTMLCanvasElement);
  mockCanvasRect(canvas);
  return canvas;
}

function clickPixel(canvas: HTMLCanvasElement, x: number, y: number, options: Record<string, unknown> = {}) {
  const clientX = x * ZOOM + 1;
  const clientY = y * ZOOM + 1;
  fireEvent.pointerDown(canvas, { clientX, clientY, button: 0, pointerId: 1, ...options });
  fireEvent.pointerUp(canvas, { clientX, clientY, button: 0, pointerId: 1, ...options });
}

test("once a cart is loaded, the toolbar, palette, canvas, and 256-sprite navigator all render", async () => {
  renderSpriteTab();

  await getReadyCanvas();
  expect(screen.getByRole("group", { name: "Toolbar" })).toBeTruthy();
  expect(screen.getByRole("group", { name: "Palette" })).toBeTruthy();
  for (let i = 0; i < 16; i++) {
    expect(screen.getByLabelText(`Color ${i}`)).toBeTruthy();
  }
  expect(screen.getByLabelText("Sprite 0")).toBeTruthy();
  expect(screen.getByLabelText("Sprite 255")).toBeTruthy();
});

test("draw tool plots the active color at the clicked pixel in the 0-127 sprite range (gfx only)", async () => {
  renderSpriteTab();
  const canvas = await getReadyCanvas();

  clickPixel(canvas, 10, 20);

  await waitFor(() => {
    expect(latestCart!.gfx.pixels[pixelIndex(10, 20)]).toBe(8);
  });
});

test("draw tool on a pixel in the shared 128-255 range mirrors the write into cart.map.cells", async () => {
  renderSpriteTab();
  const canvas = await getReadyCanvas();
  const existingHighNibble = latestCart!.gfx.pixels[pixelIndex(11, 64)]!;

  clickPixel(canvas, 10, 64);

  await waitFor(() => {
    expect(latestCart!.gfx.pixels[pixelIndex(10, 64)]).toBe(8);
  });
  expect(latestCart!.map.cells[5]).toBe(((existingHighNibble << 4) | 8) & 0xff);
});

test("selecting a palette color changes the color subsequently plotted by the draw tool", async () => {
  const user = userEvent.setup();
  renderSpriteTab();
  const canvas = await getReadyCanvas();

  await user.click(screen.getByLabelText("Color 12"));
  clickPixel(canvas, 3, 3);

  await waitFor(() => {
    expect(latestCart!.gfx.pixels[pixelIndex(3, 3)]).toBe(12);
  });
});

test("select tool + Fill tool fills only the selected sprite's bounds, leaving pixels outside untouched", async () => {
  const user = userEvent.setup();
  renderSpriteTab();
  const canvas = await getReadyCanvas();
  const originalOutsidePixel = latestCart!.gfx.pixels[pixelIndex(20, 20)];

  await user.click(screen.getByLabelText("Sprite 0"));
  await user.click(screen.getByLabelText("Color 6"));
  await user.click(screen.getByLabelText("Fill"));
  clickPixel(canvas, 3, 3);

  await waitFor(() => {
    expect(latestCart!.gfx.pixels[pixelIndex(0, 0)]).toBe(6);
    expect(latestCart!.gfx.pixels[pixelIndex(7, 7)]).toBe(6);
  });
  expect(latestCart!.gfx.pixels[pixelIndex(8, 0)]).not.toBe(6);
  expect(latestCart!.gfx.pixels[pixelIndex(20, 20)]).toBe(originalOutsidePixel);
});

test("copy from a 0-127 sprite and paste into a 128-255 sprite writes gfx and mirrors cart.map.cells", async () => {
  const user = userEvent.setup();
  renderSpriteTab();
  const canvas = await getReadyCanvas();

  await user.click(screen.getByLabelText("Sprite 5"));
  await user.click(screen.getByLabelText("Color 12"));
  await user.click(screen.getByLabelText("Fill"));
  clickPixel(canvas, 3, 3);
  await waitFor(() => {
    expect(latestCart!.gfx.pixels[pixelIndex(40, 0)]).toBe(12);
  });

  await user.click(screen.getByLabelText("Sprite 5"));
  await user.click(screen.getByLabelText("Copy"));
  await user.click(screen.getByLabelText("Sprite 130"));
  await user.click(screen.getByLabelText("Paste"));

  await waitFor(() => {
    expect(latestCart!.gfx.pixels[pixelIndex(16, 64)]).toBe(12);
    expect(latestCart!.gfx.pixels[pixelIndex(23, 71)]).toBe(12);
  });
  expect(latestCart!.map.cells[8]).toBe(0xcc);
});

test("CTRL-click with the draw tool replaces every pixel of the sampled color across the full view, not just the clicked pixel", async () => {
  const user = userEvent.setup();
  renderSpriteTab();
  const canvas = await getReadyCanvas();

  await user.click(screen.getByLabelText("Color 5"));
  clickPixel(canvas, 0, 0);
  clickPixel(canvas, 1, 0);
  await user.click(screen.getByLabelText("Color 3"));
  clickPixel(canvas, 2, 0);
  await waitFor(() => {
    expect(latestCart!.gfx.pixels[pixelIndex(1, 0)]).toBe(5);
  });

  await user.click(screen.getByLabelText("Color 9"));
  clickPixel(canvas, 0, 0, { ctrlKey: true });

  await waitFor(() => {
    expect(latestCart!.gfx.pixels[pixelIndex(0, 0)]).toBe(9);
  });
  expect(latestCart!.gfx.pixels[pixelIndex(1, 0)]).toBe(9);
  expect(latestCart!.gfx.pixels[pixelIndex(2, 0)]).toBe(3);
});

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { useEffect } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DecodedCart } from "../../internal/pico8/cart.ts";
import { decode, encode } from "../../internal/pico8/cart.ts";
import { CartProvider, useCart } from "../state/CartContext.tsx";
import { MapTab } from "./MapTab.tsx";

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

function renderMapTab(fixture = "dark tomb.p8.png") {
  latestCart = null;
  latestOriginalBytes = null;
  const bytes = readFixtureBytes(fixture);
  const utils = render(
    <CartProvider>
      <Loader bytes={bytes} name={fixture} />
      <CartCapture />
      <MapTab />
    </CartProvider>,
  );
  return utils;
}

const ZOOM = 4;
const CELL_PX = 8 * ZOOM;

function mockCanvasRect(canvas: HTMLCanvasElement, widthCells: number, heightCells: number) {
  Object.defineProperty(canvas, "getBoundingClientRect", {
    configurable: true,
    value: () => ({
      left: 0,
      top: 0,
      right: widthCells * CELL_PX,
      bottom: heightCells * CELL_PX,
      width: widthCells * CELL_PX,
      height: heightCells * CELL_PX,
      x: 0,
      y: 0,
      toJSON() {
        return {};
      },
    }),
  });
}

async function getReadyMapCanvas(): Promise<HTMLCanvasElement> {
  const canvas = await waitFor(() => screen.getByTestId("map-canvas") as HTMLCanvasElement);
  mockCanvasRect(canvas, 128, 64);
  return canvas;
}

async function getReadyPickerCanvas(): Promise<HTMLCanvasElement> {
  const canvas = await waitFor(() => screen.getByTestId("map-sprite-picker") as HTMLCanvasElement);
  mockCanvasRect(canvas, 16, 16);
  return canvas;
}

function clickCell(canvas: HTMLCanvasElement, x: number, y: number, options: Record<string, unknown> = {}) {
  const clientX = x * CELL_PX + 1;
  const clientY = y * CELL_PX + 1;
  fireEvent.pointerDown(canvas, { clientX, clientY, button: 0, pointerId: 1, ...options });
  fireEvent.pointerUp(canvas, { clientX, clientY, button: 0, pointerId: 1, ...options });
}

test("once a cart is loaded, the toolbar, map canvas, and sprite picker all render", async () => {
  renderMapTab();

  await getReadyMapCanvas();
  await getReadyPickerCanvas();
  expect(screen.getByRole("group", { name: "Map toolbar" })).toBeTruthy();
});

test("stamp tool places the default stamp (sprite 0) on click, on a map-only row (>= 32)", async () => {
  renderMapTab();
  const canvas = await getReadyMapCanvas();

  clickCell(canvas, 10, 40);

  await waitFor(() => {
    expect(latestCart!.map.cells[40 * 128 + 10]).toBe(0);
  });
});

test("picking a sprite from the picker then stamping places that sprite index on the map", async () => {
  renderMapTab();
  const mapCanvas = await getReadyMapCanvas();
  const picker = await getReadyPickerCanvas();

  fireEvent.pointerDown(picker, { clientX: 5 * 16 + 1, clientY: 0 * 16 + 1, button: 0, pointerId: 2 });
  fireEvent.pointerUp(picker, { clientX: 5 * 16 + 1, clientY: 0 * 16 + 1, button: 0, pointerId: 2 });

  clickCell(mapCanvas, 20, 40);

  await waitFor(() => {
    expect(latestCart!.map.cells[40 * 128 + 20]).toBe(5);
  });
});

test("stamp tool click-drag paints a continuous line of the single-sprite stamp across cells", async () => {
  renderMapTab();
  const canvas = await getReadyMapCanvas();

  fireEvent.pointerDown(canvas, { clientX: 1, clientY: 40 * CELL_PX + 1, button: 0, pointerId: 3 });
  fireEvent.pointerMove(canvas, { clientX: 3 * CELL_PX + 1, clientY: 40 * CELL_PX + 1, button: 0, pointerId: 3 });
  fireEvent.pointerUp(canvas, { clientX: 3 * CELL_PX + 1, clientY: 40 * CELL_PX + 1, button: 0, pointerId: 3 });

  await waitFor(() => {
    expect(latestCart!.map.cells[40 * 128 + 0]).toBe(0);
    expect(latestCart!.map.cells[40 * 128 + 1]).toBe(0);
    expect(latestCart!.map.cells[40 * 128 + 2]).toBe(0);
    expect(latestCart!.map.cells[40 * 128 + 3]).toBe(0);
  });
});

test("select tool + Copy captures a map region as the current stamp, then the stamp tool pastes it elsewhere", async () => {
  const user = userEvent.setup();
  renderMapTab();
  const canvas = await getReadyMapCanvas();

  const picker = await getReadyPickerCanvas();
  fireEvent.pointerDown(picker, { clientX: 7 * 16 + 1, clientY: 0 * 16 + 1, button: 0, pointerId: 4 });
  fireEvent.pointerUp(picker, { clientX: 7 * 16 + 1, clientY: 0 * 16 + 1, button: 0, pointerId: 4 });
  clickCell(canvas, 50, 40);
  clickCell(canvas, 51, 40);
  await waitFor(() => {
    expect(latestCart!.map.cells[40 * 128 + 50]).toBe(7);
    expect(latestCart!.map.cells[40 * 128 + 51]).toBe(7);
  });

  await user.click(screen.getByLabelText("Select"));
  fireEvent.pointerDown(canvas, { clientX: 50 * CELL_PX + 1, clientY: 40 * CELL_PX + 1, button: 0, pointerId: 5 });
  fireEvent.pointerMove(canvas, { clientX: 51 * CELL_PX + 1, clientY: 40 * CELL_PX + 1, button: 0, pointerId: 5 });
  fireEvent.pointerUp(canvas, { clientX: 51 * CELL_PX + 1, clientY: 40 * CELL_PX + 1, button: 0, pointerId: 5 });
  await user.click(screen.getByLabelText("Copy"));
  await user.click(screen.getByLabelText("Stamp"));
  clickCell(canvas, 60, 45);

  await waitFor(() => {
    expect(latestCart!.map.cells[45 * 128 + 60]).toBe(7);
    expect(latestCart!.map.cells[45 * 128 + 61]).toBe(7);
  });
});

test("fill tool with an active selection fills only the selected bounds with the current stamp's sprite", async () => {
  const user = userEvent.setup();
  renderMapTab();
  const canvas = await getReadyMapCanvas();
  const picker = await getReadyPickerCanvas();

  fireEvent.pointerDown(picker, { clientX: 9 * 16 + 1, clientY: 0 * 16 + 1, button: 0, pointerId: 6 });
  fireEvent.pointerUp(picker, { clientX: 9 * 16 + 1, clientY: 0 * 16 + 1, button: 0, pointerId: 6 });

  await user.click(screen.getByLabelText("Select"));
  fireEvent.pointerDown(canvas, { clientX: 40 * CELL_PX + 1, clientY: 40 * CELL_PX + 1, button: 0, pointerId: 7 });
  fireEvent.pointerMove(canvas, { clientX: 41 * CELL_PX + 1, clientY: 41 * CELL_PX + 1, button: 0, pointerId: 7 });
  fireEvent.pointerUp(canvas, { clientX: 41 * CELL_PX + 1, clientY: 41 * CELL_PX + 1, button: 0, pointerId: 7 });

  await user.click(screen.getByLabelText("Fill"));
  clickCell(canvas, 3, 3);

  await waitFor(() => {
    expect(latestCart!.map.cells[40 * 128 + 40]).toBe(9);
    expect(latestCart!.map.cells[41 * 128 + 41]).toBe(9);
  });
  expect(latestCart!.map.cells[39 * 128 + 40]).not.toBe(9);
});

test("right-click eyedrops a cell's sprite into the current stamp, subsequently placed by the stamp tool", async () => {
  renderMapTab();
  const canvas = await getReadyMapCanvas();
  const picker = await getReadyPickerCanvas();

  fireEvent.pointerDown(picker, { clientX: 11 * 16 + 1, clientY: 0 * 16 + 1, button: 0, pointerId: 8 });
  fireEvent.pointerUp(picker, { clientX: 11 * 16 + 1, clientY: 0 * 16 + 1, button: 0, pointerId: 8 });
  clickCell(canvas, 70, 40);
  await waitFor(() => {
    expect(latestCart!.map.cells[40 * 128 + 70]).toBe(11);
  });

  fireEvent.contextMenu(canvas, { clientX: 70 * CELL_PX + 1, clientY: 40 * CELL_PX + 1 });
  clickCell(canvas, 75, 40);

  await waitFor(() => {
    expect(latestCart!.map.cells[40 * 128 + 75]).toBe(11);
  });
});

test("shift-drag over a 2x2 block in the picker selects a multi-sprite stamp, placed as a block by the stamp tool", async () => {
  renderMapTab();
  const canvas = await getReadyMapCanvas();
  const picker = await getReadyPickerCanvas();

  fireEvent.pointerDown(picker, { clientX: 4 * 16 + 1, clientY: 1 * 16 + 1, button: 0, pointerId: 10, shiftKey: true });
  fireEvent.pointerMove(picker, { clientX: 5 * 16 + 1, clientY: 2 * 16 + 1, button: 0, pointerId: 10, shiftKey: true });
  fireEvent.pointerUp(picker, { clientX: 5 * 16 + 1, clientY: 2 * 16 + 1, button: 0, pointerId: 10, shiftKey: true });

  clickCell(canvas, 90, 40);

  await waitFor(() => {
    expect(latestCart!.map.cells[40 * 128 + 90]).toBe(20);
    expect(latestCart!.map.cells[40 * 128 + 91]).toBe(21);
    expect(latestCart!.map.cells[41 * 128 + 90]).toBe(36);
    expect(latestCart!.map.cells[41 * 128 + 91]).toBe(37);
  });
});

test("dedicated Eyedrop tool picks up a cell's sprite as the current stamp without needing right-click", async () => {
  const user = userEvent.setup();
  renderMapTab();
  const canvas = await getReadyMapCanvas();
  const picker = await getReadyPickerCanvas();

  fireEvent.pointerDown(picker, { clientX: 13 * 16 + 1, clientY: 0 * 16 + 1, button: 0, pointerId: 11 });
  fireEvent.pointerUp(picker, { clientX: 13 * 16 + 1, clientY: 0 * 16 + 1, button: 0, pointerId: 11 });
  clickCell(canvas, 30, 45);
  await waitFor(() => {
    expect(latestCart!.map.cells[45 * 128 + 30]).toBe(13);
  });

  await user.click(screen.getByLabelText("Eyedrop"));
  clickCell(canvas, 30, 45);
  await user.click(screen.getByLabelText("Stamp"));
  clickCell(canvas, 35, 45);

  await waitFor(() => {
    expect(latestCart!.map.cells[45 * 128 + 35]).toBe(13);
  });
});

test("the index overlay toggle button reflects its pressed state", async () => {
  const user = userEvent.setup();
  renderMapTab();
  await getReadyMapCanvas();

  const toggle = screen.getByLabelText("Toggle sprite index overlay");
  expect(toggle.getAttribute("aria-pressed")).toBe("false");

  await user.click(toggle);

  expect(toggle.getAttribute("aria-pressed")).toBe("true");
});

test("stamping onto a shared-region cell (row < 32) mirrors the write into cart.gfx.pixels, and the cart round-trips through encode/decode", async () => {
  renderMapTab();
  const canvas = await getReadyMapCanvas();
  const picker = await getReadyPickerCanvas();

  fireEvent.pointerDown(picker, { clientX: 3 * 16 + 1, clientY: 0 * 16 + 1, button: 0, pointerId: 9 });
  fireEvent.pointerUp(picker, { clientX: 3 * 16 + 1, clientY: 0 * 16 + 1, button: 0, pointerId: 9 });

  clickCell(canvas, 8, 0);

  await waitFor(() => {
    expect(latestCart!.map.cells[8]).toBe(3);
  });
  expect(latestCart!.gfx.pixels[64 * 128 + 16]).toBe(0x3);
  expect(latestCart!.gfx.pixels[64 * 128 + 17]).toBe(0x0);

  const reEncoded = encode(latestCart!, latestOriginalBytes!);
  const roundTripped = decode(reEncoded);
  expect(roundTripped.map).toEqual(latestCart!.map);
  expect(roundTripped.gfx).toEqual(latestCart!.gfx);
});

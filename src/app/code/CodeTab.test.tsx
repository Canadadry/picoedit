import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { useEffect } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DecodedCart } from "../../internal/pico8/cart.ts";
import { CartProvider, useCart } from "../state/CartContext.tsx";
import { CodeTab } from "./CodeTab.tsx";
import { splitIntoTabs } from "./tools.ts";

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

function renderCodeTab(fixture = "dark tomb.p8.png") {
  latestCart = null;
  const bytes = readFixtureBytes(fixture);
  const utils = render(
    <CartProvider>
      <Loader bytes={bytes} name={fixture} />
      <CartCapture />
      <CodeTab />
    </CartProvider>,
  );
  return utils;
}

function getTextarea(): HTMLTextAreaElement {
  return screen.getByTestId("code-editor-textarea") as HTMLTextAreaElement;
}

test("before a cart is loaded, CodeTab prompts the user to load one instead of rendering the editor", () => {
  render(
    <CartProvider>
      <CodeTab />
    </CartProvider>,
  );

  expect(screen.getByText(/load a cart in the file tab first/i)).toBeTruthy();
  expect(screen.queryByTestId("code-editor-textarea")).toBeNull();
});

test("a cart with 6 real -->8 markers (cab ride.p8.png) shows 7 tabs in the right order with the right content", async () => {
  const user = userEvent.setup();
  renderCodeTab("cab ride.p8.png");
  await waitFor(() => getTextarea());

  const expectedSegments = splitIntoTabs(latestCart!.lua);
  expect(expectedSegments.length).toBe(7);

  for (let i = 0; i < expectedSegments.length; i++) {
    await user.click(screen.getByLabelText(`Tab ${i}`));
    await waitFor(() => {
      expect(getTextarea().value).toBe(expectedSegments[i]);
    });
  }
});

test("editing the active tab's textarea rejoins all segments with -->8 and writes the full source to cart.lua", async () => {
  const user = userEvent.setup();
  renderCodeTab("cab ride.p8.png");
  await waitFor(() => getTextarea());

  getTextarea().focus();
  await user.type(getTextarea(), "-- hello\n", {
    skipClick: true,
    initialSelectionStart: 0,
    initialSelectionEnd: 0,
  });

  await waitFor(() => {
    expect(latestCart!.lua.startsWith("-- hello\n")).toBe(true);
  });
  expect(latestCart!.lua).toContain("-->8");
});

test(
  "a near-limit cart (the lost night.p8.png, 15,534/15,608 bytes) shows the compressed-size warning after an edit",
  async () => {
    const user = userEvent.setup();
    renderCodeTab("the lost night.p8.png");
    await waitFor(() => getTextarea());

    await user.click(getTextarea());
    await user.type(getTextarea(), "-- pad");

    await waitFor(
      () => {
        expect(screen.getByTestId("code-status-bar").textContent).toMatch(/limit/i);
      },
      { timeout: 3000 },
    );
  },
  10000,
);

test("pasting a multi-byte Unicode character into the source flags it in the overlay as truncation-prone", async () => {
  const user = userEvent.setup();
  renderCodeTab("dark tomb.p8.png");
  await waitFor(() => getTextarea());

  await user.click(getTextarea());
  await user.type(getTextarea(), "😀");

  await waitFor(() => {
    expect(screen.getAllByTestId("out-of-range-char").length).toBeGreaterThan(0);
  });
});

test("Ctrl+D duplicates the current line directly below it", async () => {
  const user = userEvent.setup();
  renderCodeTab("dark tomb.p8.png");
  const textarea = await waitFor(() => getTextarea());
  const firstLine = latestCart!.lua.split("\n")[0]!;

  textarea.setSelectionRange(1, 1);
  await user.click(textarea);
  textarea.setSelectionRange(1, 1);
  await user.keyboard("{Control>}d{/Control}");

  await waitFor(() => {
    const lines = getTextarea().value.split("\n");
    expect(lines[0]).toBe(firstLine);
    expect(lines[1]).toBe(firstLine);
  });
});

test("Ctrl+/ toggles a -- line-comment prefix on the current line", async () => {
  const user = userEvent.setup();
  renderCodeTab("dark tomb.p8.png");
  const textarea = await waitFor(() => getTextarea());
  const linesBefore = latestCart!.lua.split("\n");
  const targetLine = 1;
  const lineBefore = linesBefore[targetLine]!;
  const lineStart = linesBefore.slice(0, targetLine).join("\n").length + 1;

  await user.click(textarea);
  textarea.setSelectionRange(lineStart, lineStart);
  await user.keyboard("{Control>}/{/Control}");

  await waitFor(() => {
    const lineAfter = getTextarea().value.split("\n")[targetLine]!;
    expect(lineAfter).toBe(`--${lineBefore}`);
  });
});

test("Ctrl+F opens the find bar, and Enter moves the selection to the next match in the active tab", async () => {
  const user = userEvent.setup();
  renderCodeTab("dark tomb.p8.png");
  const textarea = await waitFor(() => getTextarea());
  const activeSegment = textarea.value;
  const queryStart = activeSegment.length > 5 ? activeSegment.slice(2, 5) : activeSegment;

  await user.click(textarea);
  await user.keyboard("{Control>}f{/Control}");
  const findInput = await waitFor(() => screen.getByLabelText("Find") as HTMLInputElement);
  await user.type(findInput, queryStart);
  await user.keyboard("{Enter}");

  await waitFor(() => {
    const expectedIndex = activeSegment.toLowerCase().indexOf(queryStart.toLowerCase());
    expect(getTextarea().selectionStart).toBe(expectedIndex);
  });
});

test("the + button adds a new tab (up to PICO-8's 8-tab cap) and the × button removes one", async () => {
  const user = userEvent.setup();
  renderCodeTab("dark tomb.p8.png");
  await waitFor(() => getTextarea());
  expect(screen.getAllByRole("tab").length).toBe(1);

  await user.click(screen.getByLabelText("Add tab"));

  await waitFor(() => {
    expect(screen.getAllByRole("tab").length).toBe(2);
  });

  await user.click(screen.getByLabelText("Remove tab 1"));

  await waitFor(() => {
    expect(screen.getAllByRole("tab").length).toBe(1);
  });
});

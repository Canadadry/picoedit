import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartProvider } from "../state/CartContext.tsx";
import { FileTab } from "./FileTab.tsx";

const cartDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "cart",
);

function loadFixture(name: string, dir = cartDir): File {
  const bytes = readFileSync(path.join(dir, name));
  return new File([bytes], name, { type: "image/png" });
}

function renderFileTab() {
  return render(
    <CartProvider>
      <FileTab />
    </CartProvider>,
  );
}

function getFileInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

test("initial render shows the drop zone with no cart loaded and no error", () => {
  renderFileTab();

  expect(screen.getByText(/drag a \.p8\.png cart here/i)).toBeTruthy();
  expect(screen.queryByText(/^Loaded:/)).toBeNull();
  expect(screen.queryByRole("button", { name: /download/i })).toBeNull();
});

test("loading a valid cart fixture shows the file name, no error, and a Download button", async () => {
  const user = userEvent.setup();
  const { container } = renderFileTab();
  const file = loadFixture("dark tomb.p8.png");

  await user.upload(getFileInput(container), file);

  await waitFor(() => {
    expect(screen.getByText(/^Loaded: dark tomb\.p8\.png$/)).toBeTruthy();
  });
  expect(screen.queryByText(/failed|error/i)).toBeNull();
  expect(screen.getByRole("button", { name: /download/i })).toBeTruthy();
});

test("loading a malformed cart fixture shows an inline error and no filename or Download button", async () => {
  const user = userEvent.setup();
  const { container } = renderFileTab();
  const file = loadFixture("bad-dimensions.p8.png", path.join(cartDir, "malformed"));

  await user.upload(getFileInput(container), file);

  await waitFor(() => {
    expect(screen.getByText(/height/i)).toBeTruthy();
  });
  expect(screen.queryByText(/^Loaded:/)).toBeNull();
  expect(screen.queryByRole("button", { name: /download/i })).toBeNull();
});

test("clicking Download after a valid cart is loaded triggers the download flow without throwing", async () => {
  const user = userEvent.setup();
  const createObjectURL = vi.fn(() => "blob:mock-url");
  const revokeObjectURL = vi.fn();
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;

  const { container } = renderFileTab();
  const file = loadFixture("dark tomb.p8.png");
  await user.upload(getFileInput(container), file);
  await waitFor(() => {
    expect(screen.getByText(/^Loaded: dark tomb\.p8\.png$/)).toBeTruthy();
  });

  const downloadButton = screen.getByRole("button", { name: /download/i });
  await user.click(downloadButton);

  expect(createObjectURL).toHaveBeenCalledTimes(1);
  expect(createObjectURL.mock.calls[0]![0]).toBeInstanceOf(Blob);
  expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
});

test("dropping a second valid cart while one is loaded replaces it with no confirmation prompt", async () => {
  const confirmSpy = vi.spyOn(window, "confirm");
  renderFileTab();
  const dropZone = screen.getByRole("button", { name: /drag a \.p8\.png cart here/i });

  const firstFile = loadFixture("dark tomb.p8.png");
  const firstDrop = new Event("drop", { bubbles: true, cancelable: true }) as Event & {
    dataTransfer: { files: File[] };
  };
  firstDrop.dataTransfer = { files: [firstFile] };
  dropZone.dispatchEvent(firstDrop);

  await waitFor(() => {
    expect(screen.getByText(/^Loaded: dark tomb\.p8\.png$/)).toBeTruthy();
  });

  const secondFile = loadFixture("combo pool.p8.png");
  const secondDrop = new Event("drop", { bubbles: true, cancelable: true }) as Event & {
    dataTransfer: { files: File[] };
  };
  secondDrop.dataTransfer = { files: [secondFile] };
  dropZone.dispatchEvent(secondDrop);

  await waitFor(() => {
    expect(screen.getByText(/^Loaded: combo pool\.p8\.png$/)).toBeTruthy();
  });
  expect(screen.queryByText(/^Loaded: dark tomb\.p8\.png$/)).toBeNull();
  expect(confirmSpy).not.toHaveBeenCalled();
});

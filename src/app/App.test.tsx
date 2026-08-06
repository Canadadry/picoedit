import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { App } from "./App.tsx";

test("all 7 tabs render in the tab bar and / redirects to the File tab's content", () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <App />
    </MemoryRouter>,
  );

  const tabNames = ["File", "Code", "Sprite", "GFF", "Map", "Sfx", "Music"];
  for (const name of tabNames) {
    expect(screen.getByRole("link", { name })).toBeTruthy();
  }
  expect(screen.queryByRole("link", { name: "Label" })).toBeNull();

  expect(screen.getByText(/drag a \.p8\.png cart here/i)).toBeTruthy();
});

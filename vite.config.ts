import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: "src/app",
  resolve: {
    alias: {
      "node:assert/strict": fileURLToPath(new URL("./src/app/lib/node-assert-shim.ts", import.meta.url)),
    },
  },
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["**/*.test.tsx"],
  },
});

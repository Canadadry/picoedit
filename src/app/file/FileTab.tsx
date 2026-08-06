import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { encode } from "../../internal/pico8/cart.ts";
import { useCart } from "../state/CartContext.tsx";
import { cn } from "../lib/utils.ts";

function resolveDownloadFileName(fileName: string | null): string {
  return fileName ?? "cart.p8.png";
}

async function readFileBytes(file: File): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  return new Uint8Array(buffer);
}

function triggerDownload(bytes: Uint8Array, fileName: string): void {
  const blob = new Blob([bytes], { type: "image/png" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function FileTab() {
  const { cart, originalPngBytes, fileName, loadCart } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const bytes = await readFileBytes(file);
        loadCart(bytes, file.name);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load cart");
      }
    },
    [loadCart],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragActive(false);
      const file = event.dataTransfer.files[0];
      if (file) {
        void handleFile(file);
      }
    },
    [handleFile],
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragActive(false);
  }, []);

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        void handleFile(file);
      }
      event.target.value = "";
    },
    [handleFile],
  );

  const handleDownload = useCallback(() => {
    if (!cart || !originalPngBytes) {
      return;
    }
    const encoded = encode(cart, originalPngBytes);
    triggerDownload(encoded, resolveDownloadFileName(fileName));
  }, [cart, originalPngBytes, fileName]);

  return (
    <div className="flex flex-col gap-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={cn(
          "flex h-48 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-sm text-neutral-400",
          isDragActive ? "border-blue-500 bg-blue-950/30" : "border-neutral-700 bg-neutral-900",
        )}
      >
        <p>Drag a .p8.png cart here, or click to choose a file</p>
        <input
          ref={inputRef}
          type="file"
          accept=".png"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {cart && (
        <div className="flex items-center gap-4">
          <p className="text-sm text-neutral-300">Loaded: {fileName ?? "unknown"}</p>
          <button
            type="button"
            onClick={handleDownload}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
          >
            Download
          </button>
        </div>
      )}
    </div>
  );
}

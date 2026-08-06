import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { decode, type DecodedCart } from "../../internal/pico8/cart.ts";

export interface CartContextValue {
  cart: DecodedCart | null;
  originalPngBytes: Uint8Array | null;
  fileName: string | null;
  loadCart: (pngBytes: Uint8Array, fileName: string) => void;
  updateCart: (patch: Partial<DecodedCart>) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<DecodedCart | null>(null);
  const [originalPngBytes, setOriginalPngBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const loadCart = useCallback((pngBytes: Uint8Array, name: string) => {
    const decoded = decode(pngBytes);
    setCart(decoded);
    setOriginalPngBytes(pngBytes);
    setFileName(name);
  }, []);

  const updateCart = useCallback((patch: Partial<DecodedCart>) => {
    setCart((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({ cart, originalPngBytes, fileName, loadCart, updateCart }),
    [cart, originalPngBytes, fileName, loadCart, updateCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { CartItem, Product, PackBreakdownItem } from '../lib/database.types';
import { DEFAULT_PACK_BREAKDOWNS } from '../data/breweryCatalog';

export interface AddToCartOptions {
  optionLabel?: string;
  priceModifier?: number;
  optionStock?: number;
  packBreakdown?: PackBreakdownItem[];
  eventGuests?: number;
  eventType?: string;
  customTitle?: string;
  customCartKey?: string;
}

interface CartContextValue {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number, options?: AddToCartOptions) => void;
  removeFromCart: (cartKey: string) => void;
  updateQuantity: (cartKey: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
const STORAGE_KEY = 'magasinpro_cart_v1';

export function getEffectivePrice(product: Product, quantity: number, priceModifier = 0): number {
  const base = (product.bulk_quantity > 0 && quantity >= product.bulk_quantity && product.bulk_price > 0)
    ? product.bulk_price
    : product.price;
  return Math.max(0, base + priceModifier);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); }
    catch { return []; }
  });

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }, [items]);

  function addToCart(product: Product, quantity = 1, options?: AddToCartOptions) {
    const key = options?.customCartKey
      ?? (options?.optionLabel
        ? `${product.id}__${options.optionLabel}`
        : options?.eventGuests
          ? `${product.id}__${options.eventGuests}_invites`
          : product.id);

    const untracked = !product.track_stock;
    const maxQty = untracked ? 9999 : (options?.optionStock !== undefined ? options.optionStock : product.stock);
    const resolvedBreakdown = options?.packBreakdown ?? DEFAULT_PACK_BREAKDOWNS[product.id];

    setItems((prev) => {
      const existing = prev.find((it) => (it.cartKey ?? it.product.id) === key);
      if (existing) {
        return prev.map((it) => (it.cartKey ?? it.product.id) === key
          ? {
              ...it,
              quantity: Math.min(it.quantity + quantity, maxQty),
              packBreakdown: resolvedBreakdown ?? it.packBreakdown,
              customTitle: options?.customTitle ?? it.customTitle,
              eventGuests: options?.eventGuests ?? it.eventGuests,
              eventType: options?.eventType ?? it.eventType,
            }
          : it);
      }
      return [...prev, {
        product,
        quantity: Math.min(quantity, maxQty),
        cartKey: key,
        optionLabel: options?.optionLabel,
        priceModifier: options?.priceModifier,
        optionStock: options?.optionStock,
        packBreakdown: resolvedBreakdown,
        customTitle: options?.customTitle,
        eventGuests: options?.eventGuests,
        eventType: options?.eventType,
      }];
    });
  }

  function removeFromCart(cartKey: string) {
    setItems((prev) => prev.filter((it) => (it.cartKey ?? it.product.id) !== cartKey));
  }

  function updateQuantity(cartKey: string, quantity: number) {
    if (quantity <= 0) { removeFromCart(cartKey); return; }
    setItems((prev) => prev.map((it) => {
      if ((it.cartKey ?? it.product.id) !== cartKey) return it;
      const untracked = !it.product.track_stock;
      const maxQty = untracked ? 9999 : (it.optionStock !== undefined ? it.optionStock : it.product.stock);
      return { ...it, quantity: Math.min(quantity, maxQty) };
    }));
  }

  function clearCart() { setItems([]); }

  const itemCount = items.reduce((acc, it) => acc + it.quantity, 0);
  const subtotal = items.reduce(
    (acc, it) => acc + getEffectivePrice(it.product, it.quantity, it.priceModifier ?? 0) * it.quantity,
    0,
  );

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, itemCount, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

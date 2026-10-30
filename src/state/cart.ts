import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartLine } from '@/lib/types';

export interface AppliedPromo {
  code: string;
  discount: number;
  message?: string;
}

interface CartState {
  items: CartLine[];
  isOpen: boolean;
  promo: AppliedPromo | null;
  add: (productId: string, variantId: string, quantity?: number) => void;
  remove: (productId: string, variantId: string) => void;
  setQuantity: (productId: string, variantId: string, quantity: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  setPromo: (promo: AppliedPromo | null) => void;
  itemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      promo: null,
      add: (productId, variantId, quantity = 1) => {
        const items = [...get().items];
        const index = items.findIndex(
          (item) => item.productId === productId && item.variantId === variantId,
        );
        if (index >= 0) {
          items[index] = {
            ...items[index],
            quantity: Math.min(20, items[index].quantity + quantity),
          };
        } else {
          items.push({ productId, variantId, quantity: Math.min(20, Math.max(1, quantity)) });
        }
        set({ items, isOpen: true, promo: null });
      },
      remove: (productId, variantId) => {
        set({
          items: get().items.filter(
            (item) => !(item.productId === productId && item.variantId === variantId),
          ),
          promo: null,
        });
      },
      setQuantity: (productId, variantId, quantity) => {
        if (quantity <= 0) {
          get().remove(productId, variantId);
          return;
        }
        set({
          items: get().items.map((item) =>
            item.productId === productId && item.variantId === variantId
              ? { ...item, quantity: Math.min(20, Math.max(1, quantity)) }
              : item,
          ),
          promo: null,
        });
      },
      clear: () => set({ items: [], promo: null, isOpen: false }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      setPromo: (promo) => set({ promo }),
      itemCount: () => get().items.reduce((total, item) => total + item.quantity, 0),
    }),
    {
      name: 'bag.cart.v1',
      partialize: (state) => ({ items: state.items, promo: state.promo }),
    },
  ),
);

// Panier estimatif du client connecté.
//
// Le panier appartient au serveur : il est lu via GET /api/cart et modifié par
// POST/PATCH/DELETE. Après chaque mutation, le panier est relu pour que les
// quantités, les prix et le total restent exactement ceux calculés par le
// backend. Rien n'est conservé dans le localStorage.
import { create } from "zustand";
import { api, errorMessage } from "@/lib/api";
import type { Cart, CartItem, Product } from "@/types";

interface ApiCartItem {
  id: string;
  productId: string;
  companyId: string;
  quantity: number;
  unitPriceSnapshot: number;
  unitPrice: number;
  subtotal: number;
  available: boolean;
}

interface ApiCart {
  id: string | null;
  items: ApiCartItem[];
  total: number;
  indicative: boolean;
}

const emptyCart = (userId: string): Cart => ({ id: `cart-${userId}`, userId, items: [] });

const toCart = (userId: string, cart: ApiCart | null): Cart => ({
  id: cart?.id ?? `cart-${userId}`,
  userId,
  items: (cart?.items ?? []).map(
    (item): CartItem => ({
      id: item.id,
      productId: item.productId,
      companyId: item.companyId,
      quantity: item.quantity,
      unitPriceSnapshot: Number(item.unitPriceSnapshot),
    }),
  ),
});

type CartState = {
  userId: string;
  cart: Cart;
  loading: boolean;
  error: string | null;
  /** Recharge le panier du client connecté. */
  load: (userId: string) => Promise<void>;
  add: (product: Product, quantity?: number) => Promise<void>;
  setQuantity: (id: string, quantity: number) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
  /** Vider le cache (déconnexion, changement de session). */
  reset: () => void;
};

export const useCartStore = create<CartState>()((set, get) => {
  const refresh = async (userId: string) => {
    const cart = await api<ApiCart>("/cart");
    set({ cart: toCart(userId, cart), loading: false });
  };

  const run = async (mutation: () => Promise<void>) => {
    set({ loading: true, error: null });
    try {
      await mutation();
    } catch (error) {
      set({ loading: false, error: errorMessage(error) });
      throw error;
    }
  };

  return {
    userId: "",
    cart: emptyCart(""),
    loading: false,
    error: null,

    load: async (userId) => {
      set({ userId, loading: true, error: null });
      try {
        await refresh(userId);
      } catch (error) {
        set({ loading: false, error: errorMessage(error), cart: emptyCart(userId) });
      }
    },

    add: (product, quantity = 1) =>
      run(async () => {
        await api("/cart/items", {
          method: "POST",
          body: { productId: product.id, quantity: Math.max(1, Math.floor(quantity)) },
        });
        await refresh(get().userId);
      }),

    setQuantity: (id, quantity) =>
      run(async () => {
        if (quantity <= 0) {
          await api(`/cart/items/${id}`, { method: "DELETE" });
        } else {
          await api(`/cart/items/${id}`, {
            method: "PATCH",
            body: { quantity: Math.floor(quantity) },
          });
        }
        await refresh(get().userId);
      }),

    remove: (id) =>
      run(async () => {
        await api(`/cart/items/${id}`, { method: "DELETE" });
        await refresh(get().userId);
      }),

    clear: () =>
      run(async () => {
        await api("/cart", { method: "DELETE" });
        await refresh(get().userId);
      }),

    reset: () => set({ userId: "", cart: emptyCart(""), loading: false, error: null }),
  };
});

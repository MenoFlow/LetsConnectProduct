import { beforeEach, describe, expect, it } from "vitest";
import {
  addToCart,
  cartLines,
  cartLinesByCompany,
  cartTotal,
  getCart,
  removeCartItem,
  setCartItemQuantity,
} from "@/data/repository";
import { useCartStore } from "@/stores/cartStore";
import {
  approvedCompany,
  category,
  metalsCategory,
  fillDb,
  json,
  noContent,
  pendingCompany,
  pendingCompanyProduct,
  publishedProduct,
  resetStores,
  stubFetch,
} from "@/test/fixtures";
import type { Cart } from "@/types";

const apiCart = (items: unknown[]) =>
  json({ id: "cart-1", items, total: 0, indicative: true });

const servedLine = {
  id: "ci-1",
  productId: "p-sable",
  companyId: "c-ok",
  quantity: 2,
  unitPriceSnapshot: 185000,
  unitPrice: 185000,
  subtotal: 370000,
  available: true,
};

describe("lignes du panier", () => {
  beforeEach(() => {
    resetStores();
    fillDb({
      companies: [approvedCompany, pendingCompany],
      categories: [category, metalsCategory],
      products: [publishedProduct, pendingCompanyProduct],
    });
  });

  it("recalcule au prix courant et signale la révision du prix", () => {
    const cart: Cart = {
      id: "cart-1",
      userId: "u-3",
      items: [
        {
          id: "ci-1",
          productId: "p-sable",
          companyId: "c-ok",
          quantity: 2,
          unitPriceSnapshot: 160000,
        },
      ],
    };
    const lines = cartLines(cart);
    expect(lines[0]!.unitPriceSnapshot).toBe(160000);
    expect(lines[0]!.lineTotal).toBe(370000);
    expect(lines[0]!.priceRevised).toBe(true);
    expect(cartTotal(lines)).toBe(370000);
  });

  it("regroupe les lignes par entreprise", () => {
    const cart: Cart = {
      id: "cart-1",
      userId: "u-3",
      items: [
        { id: "ci-1", productId: "p-sable", companyId: "c-ok", quantity: 1, unitPriceSnapshot: 185000 },
        { id: "ci-2", productId: "p-karibo", companyId: "c-pending", quantity: 1, unitPriceSnapshot: 165000 },
      ],
    };
    const lines = cartLines(cart);
    expect(cartLinesByCompany(lines)).toHaveLength(2);
    expect(cartTotal(lines)).toBe(185000 + 165000);
  });

  it("ignore une ligne dont le produit a disparu", () => {
    const cart: Cart = {
      id: "cart-1",
      userId: "u-3",
      items: [
        { id: "ci-1", productId: "p-sable", companyId: "c-ok", quantity: 1, unitPriceSnapshot: 185000 },
        { id: "ci-9", productId: "p-supprime", companyId: "c-ok", quantity: 3, unitPriceSnapshot: 1000 },
      ],
    };
    const lines = cartLines(cart);
    expect(lines).toHaveLength(1);
    expect(cartTotal(lines)).toBe(185000);
  });
});

describe("mutations du panier", () => {
  beforeEach(() => {
    resetStores();
    fillDb({
      companies: [approvedCompany],
      categories: [category],
      products: [publishedProduct],
    });
    useCartStore.setState({ userId: "u-3" });
  });

  it("ajoute en POSTant /api/cart/items puis relit le panier du serveur", async () => {
    const calls = stubFetch((url) => {
      if (url === "/api/cart/items") return noContent();
      if (url === "/api/cart") return apiCart([servedLine]);
      return json({ message: "Route inattendue." }, 404);
    });

    await addToCart("u-3", publishedProduct, 2);

    expect(calls[0]).toMatchObject({
      url: "/api/cart/items",
      method: "POST",
      credentials: "include",
      body: { productId: "p-sable", quantity: 2 },
    });
    expect(calls[0]!.headers["X-Requested-With"]).toBe("MaterialConnect");
    expect(calls[1]).toMatchObject({ url: "/api/cart", method: "GET" });
    expect(getCart("u-3").items).toEqual([
      {
        id: "ci-1",
        productId: "p-sable",
        companyId: "c-ok",
        quantity: 2,
        unitPriceSnapshot: 185000,
      },
    ]);
  });

  it("signale un refus du serveur et ne modifie pas le panier", async () => {
    stubFetch(() => json({ message: "Session expirée. Reconnectez-vous." }, 401));

    await expect(addToCart("u-3", publishedProduct, 1)).rejects.toThrow(
      "Session expirée. Reconnectez-vous.",
    );
    expect(useCartStore.getState().error).toBe("Session expirée. Reconnectez-vous.");
    expect(getCart("u-3").items).toEqual([]);
  });

  it("change une quantité par PATCH puis relit le panier", async () => {
    const calls = stubFetch((url) => {
      if (url === "/api/cart/items/ci-1") return noContent();
      if (url === "/api/cart") return apiCart([{ ...servedLine, quantity: 4 }]);
      return json({ message: "Route inattendue." }, 404);
    });

    await setCartItemQuantity("u-3", "ci-1", 4);

    expect(calls[0]).toMatchObject({
      url: "/api/cart/items/ci-1",
      method: "PATCH",
      body: { quantity: 4 },
    });
    expect(getCart("u-3").items[0]!.quantity).toBe(4);
  });

  it("retire une ligne par DELETE puis relit le panier", async () => {
    const calls = stubFetch((url) => {
      if (url === "/api/cart/items/ci-1") return noContent();
      if (url === "/api/cart") return apiCart([]);
      return json({ message: "Route inattendue." }, 404);
    });

    await removeCartItem("u-3", "ci-1");

    expect(calls[0]).toMatchObject({ url: "/api/cart/items/ci-1", method: "DELETE" });
    expect(getCart("u-3").items).toEqual([]);
  });
});

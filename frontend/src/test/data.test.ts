import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Conversation, MessageRecord } from "@/types";
import { useDbStore } from "@/stores/dbStore";
import {
  getCompany,
  getProduct,
  isCompanyPubliclyListed,
  isProductPubliclyListed,
  listCompanies,
  listProductsByCompany,
  listPublicCompanies,
  listPublicProducts,
  sendMessage,
} from "@/data/repository";
const { emitRealtimeMock } = vi.hoisted(() => ({ emitRealtimeMock: vi.fn() }));
vi.mock("@/lib/realtime", () => ({ emitRealtime: emitRealtimeMock }));
import {
  approvedCompany,
  category,
  metalsCategory,
  draftProduct,
  fillDb,
  pendingCompany,
  pendingCompanyProduct,
  publishedProduct,
  resetStores,
} from "@/test/fixtures";

// Les règles d'affichage public : publiées ET entreprise approuvée.
describe("visibilité publique du catalogue", () => {
  beforeEach(() => {
    resetStores();
    fillDb({
      companies: [approvedCompany, pendingCompany],
      categories: [category, metalsCategory],
      products: [publishedProduct, draftProduct, pendingCompanyProduct],
    });
  });

  it("publie un produit publié dont l'entreprise est approuvée", () => {
    expect(isProductPubliclyListed(publishedProduct)).toBe(true);
    expect(listPublicProducts().map((product) => product.id)).toEqual(["p-sable"]);
  });

  it("masque un brouillon", () => {
    expect(isProductPubliclyListed(draftProduct)).toBe(false);
  });

  it("masque un produit publié dont l'entreprise n'est pas approuvée", () => {
    expect(isCompanyPubliclyListed(pendingCompany)).toBe(false);
    expect(isProductPubliclyListed(pendingCompanyProduct)).toBe(false);
  });

  it("n'affiche que les entreprises approuvées", () => {
    expect(listCompanies()).toHaveLength(2);
    expect(listPublicCompanies().map((company) => company.id)).toEqual(["c-ok"]);
  });

  it("retrouve un produit et une entreprise par identifiant", () => {
    expect(getProduct("p-sable")?.name).toBe("Sable de rivière");
    expect(getCompany("c-ok")?.slug).toBe("tany-metaux");
    expect(getProduct("inexistant")).toBeUndefined();
  });

  it("liste les produits d'une seule entreprise", () => {
    expect(listProductsByCompany("c-pending").map((product) => product.id)).toEqual([
      "p-karibo",
    ]);
  });

  it("met à jour la conversation et ajoute le message confirmé par le serveur", async () => {
    const conversation: Conversation = {
      id: "conv-1",
      companyId: "c-ok",
      clientId: "u-3",
      subject: "Demande",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    };
    const message: MessageRecord = {
      id: "msg-1",
      conversationId: conversation.id,
      senderUserId: "u-3",
      body: "Bonjour",
      createdAt: conversation.updatedAt,
    };
    emitRealtimeMock.mockResolvedValueOnce({ conversation, message });

    await expect(sendMessage(conversation.id, message.body)).resolves.toEqual(message);

    expect(useDbStore.getState().conversations).toContainEqual(conversation);
    expect(useDbStore.getState().messages).toContainEqual(message);
  });
});

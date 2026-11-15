import { beforeEach, describe, expect, it } from "vitest";
import {
  getCompany,
  getProduct,
  isCompanyPubliclyListed,
  isProductPubliclyListed,
  listCompanies,
  listProductsByCompany,
  listPublicCompanies,
  listPublicProducts,
} from "@/data/repository";
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
});

// Requêtes du catalogue public et des listes d'entreprise.
// Fonctions pures : elles reçoivent les tables, ce qui les rend testables et
// directement remplaçables par des réponses d'API plus tard.
import type { Category, Company, Product } from "@/types";
import { AVAILABILITY_LABEL, isPubliclyListed } from "@/types";
import { formatPrice } from "./format";

// Valeurs « tout afficher » utilisées par les filtres de l'interface.
const ALL_VALUES = new Set(["", "Tous les produits", "Toutes les catégories", "Tous les secteurs"]);

export type CompanyQuery = {
  search?: string | undefined;
  sector?: string | undefined;
  city?: string | undefined;
  category?: string | undefined;
  sort?: "Pertinence" | "Nom de l’entreprise" | undefined;
};

export type ProductQuery = {
  search?: string | undefined;
  category?: string | undefined;
  city?: string | undefined;
  availability?: string | undefined;
  maxPrice?: number | undefined;
};

export type Tables = {
  companies: Company[];
  products: Product[];
  categories: Category[];
};

/** Catégories réellement couvertes par les produits d'une entreprise. */
export function companyCategoryIds(tables: Tables, companyId: string): string[] {
  return [...new Set(tables.products.filter((p) => p.companyId === companyId).map((p) => p.categoryId))];
}

export function companyCategoryNames(tables: Tables, companyId: string): string[] {
  return companyCategoryIds(tables, companyId).map(
    (id) => tables.categories.find((c) => c.id === id)?.name ?? id,
  );
}

export function companyProducts(tables: Tables, companyId: string): Product[] {
  return tables.products.filter((p) => p.companyId === companyId);
}

/** Produits visibles publiquement : publiés et entreprise approuvée. */
export function publicProducts(tables: Tables): Product[] {
  const approved = new Set(
    tables.companies.filter((c) => c.status === "APPROVED").map((c) => c.id),
  );
  return tables.products.filter(
    (p) => isPubliclyListed(p) && approved.has(p.companyId),
  );
}

export function publicCompanies(tables: Tables): Company[] {
  return tables.companies.filter((c) => c.status === "APPROVED");
}

export function filterCompanies(tables: Tables, query: CompanyQuery = {}): Company[] {
  const search = (query.search ?? "").trim().toLowerCase();
  const city = (query.city ?? "").trim().toLowerCase();

  const results = publicCompanies(tables).filter((company) => {
    if (query.sector && !ALL_VALUES.has(query.sector) && company.businessSector !== query.sector) {
      return false;
    }
    if (
      query.category &&
      !ALL_VALUES.has(query.category) &&
      !companyCategoryIds(tables, company.id).includes(
        tables.categories.find((c) => c.name === query.category)?.id ?? "",
      )
    ) {
      return false;
    }
    if (city && !`${company.city} ${company.region ?? ""}`.toLowerCase().includes(city)) {
      return false;
    }
    if (search) {
      const haystack =
        `${company.name} ${company.businessSector} ${company.city} ${company.region ?? ""} ${company.description} ${companyCategoryNames(tables, company.id).join(" ")}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  if (query.sort === "Nom de l’entreprise") {
    return [...results].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }
  return results;
}

export function filterProducts(tables: Tables, query: ProductQuery = {}): Product[] {
  const search = (query.search ?? "").trim().toLowerCase();
  const city = (query.city ?? "").trim().toLowerCase();

  return publicProducts(tables).filter((product) => {
    if (query.category && !ALL_VALUES.has(query.category)) {
      const categoryId = tables.categories.find((c) => c.name === query.category)?.id;
      if (product.categoryId !== categoryId) return false;
    }
    if (
      query.availability &&
      query.availability !== "Toutes les disponibilités" &&
      AVAILABILITY_LABEL[product.availability] !== query.availability
    ) {
      return false;
    }
    if (typeof query.maxPrice === "number" && query.maxPrice > 0 && product.unitPrice > query.maxPrice) {
      return false;
    }
    if (city) {
      const company = tables.companies.find((c) => c.id === product.companyId);
      if (!company || !`${company.city} ${company.region ?? ""}`.toLowerCase().includes(city)) {
        return false;
      }
    }
    if (search) {
      const company = tables.companies.find((c) => c.id === product.companyId);
      const haystack =
        `${product.name} ${product.description} ${product.specs ?? ""} ${company?.name ?? ""}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

/** Prix unitaire avec son unité de vente, comme l'exige la fiche produit. */
export function priceWithUnit(product: Product): string {
  return `${formatPrice(product.unitPrice)} / ${product.unit}`;
}

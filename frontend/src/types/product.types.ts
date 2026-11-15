// Produit et catégorie. Un produit appartient à une seule entreprise (companyId)
// et à une seule catégorie (categoryId).

export type ProductAvailability = "AVAILABLE" | "UNAVAILABLE" | "ON_REQUEST";
export type ProductStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface Product {
  id: string;
  companyId: string;
  categoryId: string;
  name: string;
  description: string;
  images: string[];
  unit: string;
  unitPrice: number;
  availability: ProductAvailability;
  status: ProductStatus;
  createdAt: string;
  /** Caractéristiques techniques affichées sous le nom. */
  specs?: string;
}

export interface Category {
  id: string;
  name: string;
}

export const AVAILABILITY_LABEL: Record<ProductAvailability, string> = {
  AVAILABLE: "Disponible",
  ON_REQUEST: "Sur demande",
  UNAVAILABLE: "Indisponible",
};

export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publié",
  ARCHIVED: "Archivé",
};

export const AVAILABILITY_VALUES: ProductAvailability[] = ["AVAILABLE", "ON_REQUEST", "UNAVAILABLE"];
export const PRODUCT_STATUS_VALUES: ProductStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];

/** Un produit n'est visible publiquement que s'il est publié. */
export const isPubliclyListed = (product: Product) => product.status === "PUBLISHED";

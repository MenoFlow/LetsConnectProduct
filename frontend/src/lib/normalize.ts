// Nettoyage des réponses de l'API avant de les mettre en cache.
//
// Prisma renvoie `null` pour les colonnes optionnelles alors que les types du
// front-end les déclarent optionnelles (champ absent), et les montants sont des
// Decimal qui peuvent arriver sous forme de chaîne. Ces fonctions ramènent les
// deux formes au contrat attendu par les écrans.
import type { Company, Database, Product, User } from "@/types";

const OPTIONAL_FIELDS = [
  "logo",
  "coverImage",
  "website",
  "region",
  "hours",
  "reviewNote",
  "reviewedAt",
  "submittedAt",
] as const;

function withoutNulls<T extends Record<string, unknown>>(value: T, keys: readonly string[]): T {
  const next: Record<string, unknown> = { ...value };
  for (const key of keys) if (next[key] === null) delete next[key];
  return next as T;
}

export const normalizeUser = (user: User): User =>
  withoutNulls(user as unknown as Record<string, unknown>, ["phone", "avatar"]) as unknown as User;

export const normalizeCompany = (company: Company): Company =>
  withoutNulls(company as unknown as Record<string, unknown>, OPTIONAL_FIELDS) as unknown as Company;

export const normalizeProduct = (product: Product): Product => ({
  ...withoutNulls(product as unknown as Record<string, unknown>, ["specs"]) as unknown as Product,
  unitPrice: Number(product.unitPrice),
});

export function normalizeDatabase(data: Partial<Database> | null | undefined): Database {
  return {
    users: (data?.users ?? []).map(normalizeUser),
    companies: (data?.companies ?? []).map(normalizeCompany),
    companyMembers: data?.companyMembers ?? [],
    categories: data?.categories ?? [],
    products: (data?.products ?? []).map(normalizeProduct),
    conversations: data?.conversations ?? [],
    messages: data?.messages ?? [],
    favorites: data?.favorites ?? [],
    activity: data?.activity ?? [],
  };
}

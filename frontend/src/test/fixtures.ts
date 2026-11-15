// Jeu de données minimal des tests.
//
// L'application ne contient plus de base de démonstration : les écrans lisent le
// cache rempli par l'API. Les tests remplissent donc ce cache directement, et
// remplacent fetch pour vérifier les appels réellement envoyés au backend.
import { vi } from "vitest";
import { useAuthStore } from "@/stores/authStore";
import { useCartStore } from "@/stores/cartStore";
import { useDbStore } from "@/stores/dbStore";
import type {
  Category,
  Company,
  CompanyMember,
  Database,
  Product,
  User,
} from "@/types";

const NOW = "2026-01-01T00:00:00.000Z";

export const owner: User = {
  id: "u-1",
  firstName: "Solo",
  lastName: "Rakoto",
  email: "owner@exemple.mg",
  role: "COMPANY",
  isActive: true,
  createdAt: NOW,
};
export const manager: User = {
  id: "u-10",
  firstName: "Naina",
  lastName: "Rasoa",
  email: "manager@exemple.mg",
  role: "COMPANY",
  isActive: true,
  createdAt: NOW,
};
export const editor: User = {
  id: "u-11",
  firstName: "Tovo",
  lastName: "Andria",
  email: "editor@exemple.mg",
  role: "COMPANY",
  isActive: true,
  createdAt: NOW,
};
export const client: User = {
  id: "u-3",
  firstName: "Hanta",
  lastName: "Rabe",
  email: "client@exemple.mg",
  role: "CLIENT",
  isActive: true,
  createdAt: NOW,
};
export const suspendedClient: User = {
  id: "u-12",
  firstName: "Kara",
  lastName: "Nirina",
  email: "kara@exemple.mg",
  role: "CLIENT",
  isActive: false,
  createdAt: NOW,
};
export const admin: User = {
  id: "u-4",
  firstName: "Aina",
  lastName: "Ravelo",
  email: "admin@exemple.mg",
  role: "ADMIN",
  isActive: true,
  createdAt: NOW,
};

export const approvedCompany: Company = {
  id: "c-ok",
  ownerId: "u-1",
  name: "Tany Métaux",
  slug: "tany-metaux",
  description: "Négoce de matières premières minérales.",
  email: "contact@tany.mg",
  phone: "0340000000",
  address: "Ampefiloha",
  city: "Antananarivo",
  country: "Madagascar",
  businessSector: "Métaux industriels",
  status: "APPROVED",
  isVerified: true,
  createdAt: NOW,
};
export const pendingCompany: Company = {
  ...approvedCompany,
  id: "c-pending",
  name: "Karibo Minéraux",
  slug: "karibo-mineraux",
  status: "PENDING",
  isVerified: false,
};
export const rejectedCompany: Company = {
  ...approvedCompany,
  id: "c-rejected",
  name: "Agro Imerina",
  slug: "agro-imerina",
  status: "REJECTED",
  isVerified: false,
  reviewNote: "Documents incomplets",
};

export const category: Category = { id: "cat-sable", name: "Minéraux" };
export const metalsCategory: Category = { id: "cat-metaux", name: "Métaux industriels" };

export const publishedProduct: Product = {
  id: "p-sable",
  companyId: "c-ok",
  categoryId: "cat-sable",
  name: "Sable de rivière",
  description: "Sable lavé.",
  images: [],
  unit: "m³",
  unitPrice: 185000,
  availability: "AVAILABLE",
  status: "PUBLISHED",
  createdAt: NOW,
};
export const draftProduct: Product = {
  ...publishedProduct,
  id: "p-cuivre",
  categoryId: "cat-metaux",
  name: "Cuivre cathode",
  unit: "tonne",
  unitPrice: 68000,
  status: "DRAFT",
};
export const pendingCompanyProduct: Product = {
  ...publishedProduct,
  id: "p-karibo",
  companyId: "c-pending",
  name: "Bauxite brute",
  unitPrice: 165000,
};

export const members: CompanyMember[] = [
  { id: "m-1", userId: "u-1", companyId: "c-ok", membershipRole: "OWNER" },
  { id: "m-2", userId: "u-10", companyId: "c-ok", membershipRole: "MANAGER" },
  { id: "m-3", userId: "u-11", companyId: "c-ok", membershipRole: "EDITOR" },
];

const emptyDb = (): Database => ({
  users: [],
  companies: [],
  companyMembers: [],
  categories: [],
  products: [],
  conversations: [],
  messages: [],
  favorites: [],
  activity: [],
});

/** Repart d'un cache vide, comme au premier chargement de l'application. */
export function resetStores() {
  useDbStore.getState().replaceAll(emptyDb());
  useCartStore.getState().reset();
  useAuthStore.setState({ user: null, status: "unknown", error: null });
}

/** Remplit le cache comme si l'API venait de répondre. */
export function fillDb(rows: Partial<Database> = {}) {
  useDbStore.getState().replaceAll({ ...emptyDb(), ...rows });
}

export type Call = {
  url: string;
  method: string;
  body: unknown;
  credentials: string;
  headers: Record<string, string>;
};

/**
 * Remplace fetch : chaque appel est enregistré (URL, méthode, en-têtes, corps)
 * et la réponse est choisie par `routes`.
 */
export function stubFetch(routes: (url: string, init: RequestInit) => Response): Call[] {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    (input: string | URL | Request, init: RequestInit = {}) => {
      const url = String(input);
      calls.push({
        url,
        method: String(init.method ?? "GET"),
        body: typeof init.body === "string" && init.body ? JSON.parse(init.body) : undefined,
        credentials: String(init.credentials ?? "same-origin"),
        headers: (init.headers ?? {}) as Record<string, string>,
      });
      return Promise.resolve(routes(url, init));
    },
  );
  return calls;
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const noContent = (status = 204) => new Response(null, { status });

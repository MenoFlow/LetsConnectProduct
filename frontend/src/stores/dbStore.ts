// Cache des données servies par l'API.
//
// Ce store ne contient plus rien de « démonstration » : il garde en mémoire la
// dernière réponse de l'API (GET /api/workspace quand un utilisateur est
// connecté, GET /api/public/snapshot sinon). Les écrans ne le lisent jamais
// directement : ils passent par src/data/repository.ts.
//
// Rien n'est écrit dans le localStorage : une actualisation repart de
// l'API, qui est la seule source de vérité.
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { api } from "@/lib/api";
import { normalizeDatabase } from "@/lib/normalize";
import { EMPTY_DATABASE, type Database } from "@/types";
import type {
  Company,
  CompanyMember,
  CompanyStatus,
  Conversation,
  Category,
  Favorite,
  MessageRecord,
  Product,
  User,
} from "@/types";

export type LoadStatus = "idle" | "loading" | "ready" | "error";

type DbActions = {
  status: LoadStatus;
  error: string | null;
  /** Appel en cours : les écrans peuvent afficher un indicateur. */
  beginLoad: () => void;
  failLoad: (message: string) => void;
  replaceAll: (data: Database) => void;
  // Mises à jour locales du cache, appliquées après un appel API réussi.
  upsertProduct: (product: Product) => void;
  removeProduct: (id: string) => void;
  addCompany: (company: Company) => void;
  updateCompany: (id: string, patch: Partial<Company>) => void;
  setCompanyStatus: (id: string, status: CompanyStatus, note?: string) => void;
  resubmitCompany: (id: string) => void;
  upsertUser: (user: User) => void;
  setUserActive: (id: string, isActive: boolean) => void;
  upsertCategory: (category: Category) => void;
  removeCategory: (id: string) => void;
  upsertMember: (member: CompanyMember) => void;
  removeMember: (id: string) => void;
  upsertConversation: (conversation: Conversation) => void;
  removeConversation: (id: string) => void;
  addMessage: (message: MessageRecord) => void;
  upsertMessage: (message: MessageRecord) => void;
  removeMessage: (id: string) => void;
  setFavorite: (favorite: Favorite, on: boolean) => void;
};

export type DbStore = Database & DbActions;

export const useDbStore = create<DbStore>()((set, get) => ({
  ...EMPTY_DATABASE,
  status: "idle",
  error: null,

  beginLoad: () => set({ status: "loading", error: null }),
  failLoad: (message) => set({ status: "error", error: message }),
  replaceAll: (data) => set({ ...data, status: "ready", error: null }),

  upsertProduct: (product) =>
    set((state) => ({
      products: state.products.some((p) => p.id === product.id)
        ? state.products.map((p) => (p.id === product.id ? product : p))
        : [product, ...state.products],
    })),

  removeProduct: (id) => set((state) => ({ products: state.products.filter((p) => p.id !== id) })),

  addCompany: (company) => set((state) => ({ companies: [company, ...state.companies] })),

  updateCompany: (id, patch) =>
    set((state) => ({
      companies: state.companies.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),

  setCompanyStatus: (id, status, note) =>
    set((state) => ({
      companies: state.companies.map((c) => {
        if (c.id !== id) return c;
        const next: Company = {
          ...c,
          status,
          isVerified: status === "APPROVED" ? true : c.isVerified,
          reviewedAt: new Date().toISOString(),
        };
        if (note?.trim()) next.reviewNote = note.trim();
        else delete next.reviewNote;
        return next;
      }),
    })),

  resubmitCompany: (id) =>
    set((state) => ({
      companies: state.companies.map((c) => {
        if (c.id !== id || c.status !== "REJECTED") return c;
        const next: Company = { ...c, status: "PENDING", submittedAt: new Date().toISOString() };
        delete next.reviewedAt;
        return next;
      }),
    })),

  upsertUser: (user) =>
    set((state) => ({
      users: state.users.some((u) => u.id === user.id)
        ? state.users.map((u) => (u.id === user.id ? user : u))
        : [...state.users, user],
    })),

  setUserActive: (id, isActive) =>
    set((state) => ({
      users: state.users.map((u) => (u.id === id ? { ...u, isActive } : u)),
    })),

  upsertCategory: (category) =>
    set((state) => ({
      categories: state.categories.some((c) => c.id === category.id)
        ? state.categories.map((c) => (c.id === category.id ? category : c))
        : [...state.categories, category],
    })),

  removeCategory: (id) => set((state) => ({ categories: state.categories.filter((c) => c.id !== id) })),

  upsertMember: (member) =>
    set((state) => ({
      companyMembers: state.companyMembers.some((m) => m.id === member.id)
        ? state.companyMembers.map((m) => (m.id === member.id ? member : m))
        : [...state.companyMembers, member],
    })),

  removeMember: (id) =>
    set((state) => ({ companyMembers: state.companyMembers.filter((m) => m.id !== id) })),

  upsertConversation: (conversation) =>
    set((state) => ({
      conversations: state.conversations.some((c) => c.id === conversation.id)
        ? state.conversations.map((c) => (c.id === conversation.id ? conversation : c))
        : [conversation, ...state.conversations],
    })),

  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      messages: state.messages.filter((m) => m.conversationId !== id),
    })),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
      conversations: state.conversations.map((c) =>
        c.id === message.conversationId ? { ...c, updatedAt: message.createdAt } : c,
      ),
    })),

  upsertMessage: (message) =>
    set((state) => ({
      messages: state.messages.some((item) => item.id === message.id)
        ? state.messages.map((item) => (item.id === message.id ? message : item))
        : [...state.messages, message],
    })),

  removeMessage: (id) =>
    set((state) => ({ messages: state.messages.filter((message) => message.id !== id) })),

  setFavorite: (favorite, on) =>
    set((state) => ({
      favorites: on
        ? state.favorites.some((f) => f.id === favorite.id)
          ? state.favorites
          : [...state.favorites, favorite]
        : state.favorites.filter(
            (f) => !(f.userId === favorite.userId && f.companyId === favorite.companyId),
          ),
    })),
}));

/** Charge la snapshot demandée et remplace le cache. */
async function loadFrom(path: string) {
  const store = useDbStore.getState();
  store.beginLoad();
  try {
    store.replaceAll(normalizeDatabase(await api<Database>(path)));
  } catch (error) {
    store.failLoad(error instanceof Error ? error.message : "Chargement des données impossible.");
  }
}

/** Données publiques : entreprises approuvées, produits publiés, catégories. */
export const loadPublicData = () => loadFrom("/public/snapshot");

/** Données de l'utilisateur connecté (workspace complet, filtré par le backend). */
export const loadWorkspace = () => loadFrom("/workspace");

/** Relance le chargement en cours (bouton « Réessayer »). */
export const reloadWorkspace = () => loadWorkspace();

/** Raccourci pour les écrans : état du chargement en cours. */
export const useDbStatus = (): { status: LoadStatus; error: string | null } =>
  useDbStore(useShallow((state) => ({ status: state.status, error: state.error })));

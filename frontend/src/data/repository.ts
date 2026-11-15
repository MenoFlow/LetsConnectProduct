// Couche d'accès aux données : le seul point de contact des écrans avec les
// données. Les lectures lisent le cache alimenté par l'API (src/stores/dbStore),
// les écritures appellent réellement le backend puis mettent le cache à jour
// avec la réponse du serveur. Aucune donnée n'est inventée ni stockée dans le
// navigateur : le backend est la seule source de vérité.
//
// Deux formes coexistent volontairement :
//  - list*/get* : lecture à la demande (head(), beforeLoad, gestionnaires).
//  - use*       : lecture réactive pour les composants.
// Les mutations sont toutes asynchrones : un écran doit les attendre.
import { useDbStore, useDbStatus, reloadWorkspace } from "@/stores/dbStore";
import { useCartStore } from "@/stores/cartStore";
import { useAuthStore, getCurrentUser as readCurrentUser } from "@/stores/authStore";
import { useCompanyStore, getMembership } from "@/stores/companyStore";
import { api } from "@/lib/api";
import { normalizeCompany, normalizeProduct, normalizeUser } from "@/lib/normalize";
import { DEMO_PASSWORD, demoAccounts } from "@/data/demo";
import type { Database } from "@/types";
import type {
  ActivityRecord,
  Cart,
  Category,
  Company,
  CompanyMember,
  CompanyStatus,
  Conversation,
  Favorite,
  MessageRecord,
  Product,
  User,
} from "@/types";

export type {
  ActivityRecord,
  Cart,
  Category,
  Company,
  CompanyMember,
  CompanyStatus,
  Conversation,
  Favorite,
  MessageRecord,
  Product,
  User,
};
export type { Database };
export { useDbStatus, reloadWorkspace };
export { DEMO_PASSWORD, demoAccounts as demoLogins };

const db = () => useDbStore.getState();
const emptyCart = (userId: string): Cart => ({ id: `cart-${userId}`, userId, items: [] });

// ---------------------------------------------------------------- Utilisateurs

export const listUsers = (): User[] => db().users;
export const getUser = (id: string): User | undefined => listUsers().find((u) => u.id === id);
export const getCurrentUser = (): User | undefined => readCurrentUser();
export const useCurrentUser = (): User | undefined =>
  useAuthStore((state) => state.user ?? undefined);
export const useUsers = (): User[] => useDbStore((s) => s.users);

/** Champs qu'un compte peut modifier lui-même (validés par le backend). */
const USER_PATCH_KEYS = ["firstName", "lastName", "phone", "avatar"] as const;

export const upsertUser = async (user: User): Promise<User> => {
  const body: Record<string, unknown> = {};
  for (const key of USER_PATCH_KEYS) if (user[key] !== undefined) body[key] = user[key];
  const saved = normalizeUser(await api<User>(`/users/${user.id}`, { method: "PATCH", body }));
  db().upsertUser(saved);
  return saved;
};

export const setUserActive = async (id: string, isActive: boolean): Promise<User> => {
  const saved = normalizeUser(
    await api<User>(`/users/${id}/active`, { method: "PATCH", body: { isActive } }),
  );
  db().upsertUser(saved);
  return saved;
};

// ---------------------------------------------------------------- Entreprises

export const listCompanies = (): Company[] => db().companies;
export const getCompany = (id: string): Company | undefined =>
  listCompanies().find((c) => c.id === id);
export const getCompanyBySlug = (slug: string): Company | undefined =>
  listCompanies().find((c) => c.slug === slug);
export const useCompanies = (): Company[] => useDbStore((s) => s.companies);

/** Champs modifiables par l'entreprise elle-même (validés par le backend). */
const COMPANY_PATCH_KEYS = [
  "name",
  "description",
  "email",
  "phone",
  "website",
  "address",
  "city",
  "country",
  "businessSector",
  "hours",
  "region",
  "logo",
  "coverImage",
] as const;

export const updateCompany = async (
  id: string,
  patch: Partial<Company>,
): Promise<Company> => {
  const body: Record<string, unknown> = {};
  for (const key of COMPANY_PATCH_KEYS) {
    const value = patch[key];
    if (value !== undefined) body[key] = value;
  }
  const saved = normalizeCompany(
    await api<Company>(`/companies/${id}`, { method: "PATCH", body }),
  );
  db().updateCompany(id, saved);
  return saved;
};

/** Décision de modération : seule une transition autorisée par le backend passe. */
export const setCompanyStatus = async (
  id: string,
  status: CompanyStatus,
  note?: string,
): Promise<Company> => {
  if (status === "PENDING") throw new Error("Une entreprise ne peut pas être remise en attente.");
  const saved = normalizeCompany(
    await api<Company>(`/companies/${id}/review`, {
      method: "POST",
      body: note?.trim() ? { status, note: note.trim() } : { status },
    }),
  );
  db().updateCompany(id, saved);
  return saved;
};

export const resubmitCompany = async (id: string): Promise<void> => {
  await api(`/companies/${id}/resubmit`, { method: "POST" });
  db().resubmitCompany(id);
};

export const listCompanyMembers = (companyId: string): CompanyMember[] =>
  db().companyMembers.filter((m) => m.companyId === companyId);
export const listCompanyMembersForUser = (userId: string): CompanyMember[] =>
  db().companyMembers.filter((m) => m.userId === userId);
export const useCompanyMembers = (): CompanyMember[] => useDbStore((s) => s.companyMembers);

export const addMember = async (
  member: Omit<CompanyMember, "id">,
): Promise<CompanyMember> => {
  const saved = await api<CompanyMember>("/members", { method: "POST", body: member });
  db().upsertMember(saved);
  return saved;
};

export const updateMemberRole = async (
  id: string,
  membershipRole: CompanyMember["membershipRole"],
): Promise<CompanyMember> => {
  const saved = await api<CompanyMember>(`/members/${id}`, {
    method: "PATCH",
    body: { membershipRole },
  });
  db().upsertMember(saved);
  return saved;
};

export const removeMember = async (id: string): Promise<void> => {
  await api(`/members/${id}`, { method: "DELETE" });
  db().removeMember(id);
};

/** Retrouve un compte entreprise par email, pour l'ajouter comme membre. */
export const lookupMember = (companyId: string, email: string): Promise<User> =>
  api<User>(
    `/companies/${companyId}/member-lookup?email=${encodeURIComponent(email.trim().toLowerCase())}`,
  ).then(normalizeUser);

/** Catégories réellement couvertes par les produits publiés de l'entreprise. */
export const listCompanyCategoryIds = (companyId: string): string[] => [
  ...new Set(
    db()
      .products.filter((p) => p.companyId === companyId)
      .map((p) => p.categoryId),
  ),
];

export const getMembershipForUser = (userId: string | undefined, companyId?: string) =>
  getMembership(userId, companyId);
export const useActiveCompanyId = () => useCompanyStore((s) => s.activeCompanyId);
export const setActiveCompany = (companyId: string | null) =>
  useCompanyStore.getState().setActiveCompany(companyId);

/** Liaison de l'utilisateur connecté avec l'entreprise qu'il gère. */
export function useMyMembership(): CompanyMember | undefined {
  const user = useCurrentUser();
  const members = useCompanyMembers();
  const activeCompanyId = useActiveCompanyId();
  if (!user) return undefined;
  return (
    members.find(
      (m) => m.userId === user.id && (!activeCompanyId || m.companyId === activeCompanyId),
    ) ?? members.find((m) => m.userId === user.id)
  );
}

/** Entreprise que l'utilisateur connecté gère. */
export function useCurrentCompany(): Company | undefined {
  const membership = useMyMembership();
  const companies = useCompanies();
  if (!membership) return undefined;
  return companies.find((c) => c.id === membership.companyId);
}

export function useMyRole() {
  return useMyMembership()?.membershipRole;
}

// ---------------------------------------------------------------- Catégories

export const listCategories = (): Category[] => db().categories;
export const getCategory = (id: string): Category | undefined =>
  listCategories().find((c) => c.id === id);
export const categoryIdByName = (name: string) => listCategories().find((c) => c.name === name)?.id;
export const useCategories = (): Category[] => useDbStore((s) => s.categories);

export const upsertCategory = async (category: Category): Promise<Category> => {
  const saved = category.id
    ? await api<Category>(`/categories/${category.id}`, {
        method: "PATCH",
        body: { name: category.name },
      })
    : await api<Category>("/categories", { method: "POST", body: { name: category.name } });
  db().upsertCategory(saved);
  return saved;
};

export const removeCategory = async (id: string): Promise<void> => {
  await api(`/categories/${id}`, { method: "DELETE" });
  db().removeCategory(id);
};

// ---------------------------------------------------------------- Produits

export const listProducts = (): Product[] => db().products;
export const getProduct = (id: string): Product | undefined =>
  listProducts().find((p) => p.id === id);
export const listProductsByCompany = (companyId: string): Product[] =>
  listProducts().filter((p) => p.companyId === companyId);
export const useProducts = (): Product[] => useDbStore((s) => s.products);

/** Corps exact attendu par le backend : les colonnes qu'il ne connaît pas sont retirées. */
const productBody = (product: Product) => ({
  companyId: product.companyId,
  categoryId: product.categoryId,
  name: product.name,
  description: product.description,
  images: product.images,
  unit: product.unit,
  unitPrice: Number(product.unitPrice),
  availability: product.availability,
  status: product.status,
  ...(product.specs ? { specs: product.specs } : {}),
});

export const upsertProduct = async (product: Product): Promise<Product> => {
  const saved = normalizeProduct(
    product.id
      ? await api<Product>(`/products/${product.id}`, {
          method: "PATCH",
          body: productBody(product),
        })
      : await api<Product>("/products", { method: "POST", body: productBody(product) }),
  );
  db().upsertProduct(saved);
  return saved;
};

export const removeProduct = async (id: string): Promise<void> => {
  await api(`/products/${id}`, { method: "DELETE" });
  db().removeProduct(id);
};

/** Une entreprise n'est publique que si elle est approuvée. */
export const isCompanyPubliclyListed = (company: Company | undefined): boolean =>
  company?.status === "APPROVED";

/** Un produit n'est public que s'il est publié ET si son entreprise est approuvée. */
export const isProductPubliclyListed = (product: Product): boolean =>
  product.status === "PUBLISHED" && isCompanyPubliclyListed(getCompany(product.companyId));

export const listPublicCompanies = (): Company[] =>
  listCompanies().filter(isCompanyPubliclyListed);
export const listPublicProducts = (): Product[] => listProducts().filter(isProductPubliclyListed);

export const usePublicCompanies = (): Company[] =>
  useCompanies().filter(isCompanyPubliclyListed);
export const usePublicProducts = (): Product[] =>
  useProducts().filter(isProductPubliclyListed);

// ---------------------------------------------------------------- Statistiques

export const listActivity = (companyId: string): ActivityRecord[] =>
  db().activity.filter((a) => a.companyId === companyId);
export const useActivity = (): ActivityRecord[] => useDbStore((s) => s.activity);

// ---------------------------------------------------------------- Favoris

export const listFavorites = (userId: string): Favorite[] =>
  db().favorites.filter((f) => f.userId === userId);
export const useFavorites = (): Favorite[] => useDbStore((s) => s.favorites);
export const isFavorite = (userId: string | undefined, companyId: string): boolean =>
  !!userId && db().favorites.some((f) => f.userId === userId && f.companyId === companyId);

/** Ajoute ou retire l'entreprise des favoris ; le serveur décide de l'état final. */
export const toggleFavorite = async (userId: string, companyId: string): Promise<boolean> => {
  const wasFavorite = isFavorite(userId, companyId);
  const saved = await api<Favorite>(`/favorites/${companyId}/toggle`, { method: "POST" });
  db().setFavorite(saved, !wasFavorite);
  return !wasFavorite;
};

// ---------------------------------------------------------------- Panier

export const getCart = (userId: string): Cart => {
  const cart = useCartStore.getState().cart;
  return cart.userId === userId ? cart : emptyCart(userId);
};
export const useCart = (): Cart => {
  const userId = useAuthStore((s) => s.user?.id);
  const cart = useCartStore((s) => s.cart);
  if (!userId) return emptyCart("");
  return cart.userId === userId ? cart : emptyCart(userId);
};
export const useCartLoading = (): boolean => useCartStore((s) => s.loading);
export const useCartError = (): string | null => useCartStore((s) => s.error);

export const addToCart = (userId: string, product: Product, quantity = 1): Promise<void> =>
  useCartStore.getState().add(product, quantity);
export const setCartItemQuantity = (userId: string, id: string, quantity: number): Promise<void> =>
  useCartStore.getState().setQuantity(id, quantity);
export const removeCartItem = (userId: string, id: string): Promise<void> =>
  useCartStore.getState().remove(id);
export const clearCart = (userId: string): Promise<void> => useCartStore.getState().clear();

export type CartLine = {
  id: string;
  product: Product;
  company: Company | undefined;
  quantity: number;
  unitPriceSnapshot: number;
  lineTotal: number;
  priceRevised: boolean;
};

/** Lignes du panier avec produit et entreprise résolus, total au prix courant. */
export function cartLines(cart: Cart): CartLine[] {
  const lines: CartLine[] = [];
  for (const item of cart.items) {
    const product = getProduct(item.productId);
    if (!product) continue;
    lines.push({
      id: item.id,
      product,
      company: getCompany(product.companyId),
      quantity: item.quantity,
      unitPriceSnapshot: item.unitPriceSnapshot,
      lineTotal: product.unitPrice * Math.max(0, item.quantity),
      priceRevised: item.unitPriceSnapshot !== product.unitPrice,
    });
  }
  return lines;
}

export const cartTotal = (lines: CartLine[]): number =>
  lines.reduce((total, line) => total + line.lineTotal, 0);

export const cartItemCount = (lines: CartLine[]): number =>
  lines.reduce((total, line) => total + Math.max(0, line.quantity), 0);

/** Regroupement visuel par entreprise. */
export function cartLinesByCompany(lines: CartLine[]): { companyId: string; lines: CartLine[] }[] {
  const map = new Map<string, CartLine[]>();
  for (const line of lines) {
    const key = line.product.companyId;
    map.set(key, [...(map.get(key) ?? []), line]);
  }
  return [...map.entries()].map(([companyId, groupLines]) => ({ companyId, lines: groupLines }));
}

// ---------------------------------------------------------------- Messagerie

export const listConversations = (): Conversation[] => db().conversations;
export const useConversations = (): Conversation[] => useDbStore((s) => s.conversations);
export const listMessagesOf = (conversationId: string): MessageRecord[] =>
  db()
    .messages.filter((m) => m.conversationId === conversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
export const useMessages = (): MessageRecord[] => useDbStore((s) => s.messages);
export const getConversation = (id: string): Conversation | undefined =>
  listConversations().find((c) => c.id === id);

/** Conversations visibles par l'utilisateur : les siennes (client) ou celles de son entreprise. */
export function listConversationsForUser(user: User, membership?: CompanyMember): Conversation[] {
  if (user.role === "ADMIN") return listConversations();
  return listConversations().filter(
    (c) =>
      c.clientId === user.id ||
      (user.role === "COMPANY" && membership && c.companyId === membership.companyId),
  );
}

export function useConversationsForCurrentUser(): Conversation[] {
  const user = useCurrentUser();
  const members = useCompanyMembers();
  const activeCompanyId = useActiveCompanyId();
  const conversations = useConversations();
  if (!user) return [];
  if (user.role === "ADMIN") return conversations;
  const membership =
    members.find(
      (m) => m.userId === user.id && (!activeCompanyId || m.companyId === activeCompanyId),
    ) ?? members.find((m) => m.userId === user.id);
  return conversations.filter(
    (c) =>
      c.clientId === user.id ||
      (user.role === "COMPANY" && membership && c.companyId === membership.companyId),
  );
}

export const sendMessage = async (
  conversationId: string,
  senderUserId: string,
  body: string,
): Promise<MessageRecord> => {
  const saved = await api<MessageRecord>(`/conversations/${conversationId}/messages`, {
    method: "POST",
    body: { body },
  });
  db().addMessage(saved);
  return saved;
};

/** Ouvre une conversation et envoie son premier message ; l'identifiant vient du serveur. */
export const startConversation = async (input: {
  companyId: string;
  clientId: string;
  subject: string;
  body: string;
}): Promise<string> => {
  const conversation = await api<Conversation>("/conversations", {
    method: "POST",
    body: { companyId: input.companyId, subject: input.subject, body: input.body },
  });
  // Le premier message est créé côté serveur sans être renvoyé : on relit
  // l'espace de travail pour que la conversation apparaisse avec son message.
  await reloadWorkspace();
  return conversation.id;
};

export const renameConversation = async (id: string, subject: string): Promise<Conversation> => {
  const saved = await api<Conversation>(`/conversations/${id}`, {
    method: "PATCH",
    body: { subject },
  });
  db().upsertConversation(saved);
  return saved;
};

export const deleteConversation = async (id: string): Promise<void> => {
  await api(`/conversations/${id}`, { method: "DELETE" });
  db().removeConversation(id);
};

/** Marque les messages de l'interlocuteur comme lus, puis relit l'espace de travail. */
export const markConversationRead = async (id: string): Promise<void> => {
  await api(`/conversations/${id}/read`, { method: "POST" });
  await reloadWorkspace();
};

// Permissions centralisées. Une seule source de vérité pour savoir ce qu'un
// utilisateur a le droit de faire ; les écrans et les gardes de route l'utilisent.
//
// RAPPEL : ces règles contrôlent l'interface uniquement. Elles ne constituent
// pas une sécurité tant qu'elles ne sont pas re-vérifiées côté backend.
import type { CompanyMember, MembershipRole, User, UserRole } from "@/types";

export type Permission =
  // CLIENT
  | "client.dashboard"
  | "client.catalogue"
  | "client.companies"
  | "client.cart"
  | "client.favorites"
  | "client.messages"
  // COMPANY
  | "company.dashboard"
  | "company.profile"
  | "company.catalogue"
  | "company.products.write"
  | "company.messages"
  | "company.statistics"
  | "company.members"
  // ADMIN
  | "admin.dashboard"
  | "admin.users"
  | "admin.companies"
  | "admin.products"
  | "admin.categories"
  | "admin.statistics";

const CLIENT_PERMISSIONS: Permission[] = [
  "client.dashboard",
  "client.catalogue",
  "client.companies",
  "client.cart",
  "client.favorites",
  "client.messages",
];

// Règles internes d'une entreprise : le rôle du membre restreint le rôle COMPANY.
const COMPANY_PERMISSIONS: Record<MembershipRole, Permission[]> = {
  // Toutes les permissions sur son entreprise, membres compris.
  OWNER: [
    "company.dashboard",
    "company.profile",
    "company.catalogue",
    "company.products.write",
    "company.messages",
    "company.statistics",
    "company.members",
  ],
  // Profil, produits, conversations et statistiques, sans gestion du propriétaire.
  MANAGER: [
    "company.dashboard",
    "company.profile",
    "company.catalogue",
    "company.products.write",
    "company.messages",
    "company.statistics",
  ],
  // Produits et conversations autorisées, sans membres ni statistiques.
  EDITOR: ["company.dashboard", "company.catalogue", "company.products.write", "company.messages"],
};

const ADMIN_PERMISSIONS: Permission[] = [
  "admin.dashboard",
  "admin.users",
  "admin.companies",
  "admin.products",
  "admin.categories",
  "admin.statistics",
];

export function permissionsFor(user: User, membership?: CompanyMember): Permission[] {
  if (user.role === "CLIENT") return CLIENT_PERMISSIONS;
  if (user.role === "ADMIN") return ADMIN_PERMISSIONS;
  if (user.role === "COMPANY") return COMPANY_PERMISSIONS[membership?.membershipRole ?? "OWNER"];
  return [];
}

export function can(user: User | undefined, permission: Permission, membership?: CompanyMember): boolean {
  if (!user || !user.isActive) return false;
  return permissionsFor(user, membership).includes(permission);
}

/** Page d'accueil de l'espace d'un utilisateur, selon son rôle. */
export function homeFor(role: UserRole | undefined): string {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "COMPANY") return "/company/dashboard";
  if (role === "CLIENT") return "/client/dashboard";
  return "/connexion";
}

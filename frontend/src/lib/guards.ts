// Garde des pages protégées : l'équivalent du composant ProtectedRoute du
// cahier des charges, adapté au routeur du projet (TanStack Router).
// Chaque espace (client / entreprise / admin) l'utilise dans son beforeLoad.
import { redirect } from "@tanstack/react-router";
import { getCurrentUser } from "@/stores/authStore";
import { getMembership } from "@/stores/companyStore";
import { can, type Permission } from "@/lib/permissions";
import type { UserRole } from "@/types";

/** Page d'accueil de l'espace d'un utilisateur, typée pour le routeur. */
export type HomeRoute =
  | "/admin/dashboard"
  | "/company/dashboard"
  | "/client/dashboard"
  | "/connexion";

export function homeRoute(role: UserRole | undefined): HomeRoute {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "COMPANY") return "/company/dashboard";
  if (role === "CLIENT") return "/client/dashboard";
  return "/connexion";
}

export function requireRole(roles: UserRole[], permission?: Permission) {
  return ({ location }: { location: { href: string } }) => {
    // La session a été vérifiée avant le premier rendu (stores/bootstrap.ts) :
    // la décision est prise côté navigateur, sur la route rendue uniquement
    // après ce contrôle.
    if (typeof window === "undefined") return;

    const user = getCurrentUser();
    if (!user) {
      throw redirect({ to: "/connexion" });
    }
    if (!roles.includes(user.role)) {
      throw redirect({ to: homeRoute(user.role) });
    }
    const membership = user.role === "COMPANY" ? getMembership(user.id) : undefined;
    if (permission && !can(user, permission, membership)) {
      throw redirect({ to: homeRoute(user.role) });
    }
    return undefined;
  };
}

// Navigation et coquille de l'espace administrateur.
import type { ReactNode } from "react";
import { Outlet, useLocation } from "@tanstack/react-router";
import { Building2, LayoutDashboard, Package, Tags, Users } from "lucide-react";
import { WorkspaceShell, type WorkspaceNavItem } from "@/components/layout/WorkspaceShell";

const nav: WorkspaceNavItem[] = [
  { to: "/admin/dashboard", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { to: "/admin/utilisateurs", label: "Utilisateurs", icon: Users },
  { to: "/admin/entreprises", label: "Entreprises", icon: Building2 },
  { to: "/admin/produits", label: "Produits", icon: Package },
  { to: "/admin/categories", label: "Catégories", icon: Tags },
];

export function AdminLayout({ title = "Administration", children }: { title?: string; children?: ReactNode }) {
  const location = useLocation();
  const current =
    nav.find((i) => location.pathname === i.to) ??
    nav.find((i) => location.pathname.startsWith(`${i.to}/`));

  return (
    <WorkspaceShell
      admin
      title={current?.label ?? title}
      eyebrow="Administration de la plateforme"
      nav={nav}
    >
      {children ?? <Outlet />}
    </WorkspaceShell>
  );
}

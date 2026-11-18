// Navigation et coquille de l'espace entreprise.
// Les entrées dépendent du rôle interne du membre (propriétaire, gérant, éditeur).
import type { ReactNode } from "react";
import { Outlet, useLocation } from "@tanstack/react-router";
import {
  Building2,
  LayoutDashboard,
  MessageSquare,
  Package,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { WorkspaceShell, type WorkspaceNavItem } from "@/components/layout/WorkspaceShell";
import {
  useConversationsForCurrentUser,
  useCurrentCompany,
  useMyMembership,
} from "@/data/repository";
import { CompanyRequestStatus } from "@/components/common/CompanyRequestStatus";
import { can } from "@/lib/permissions";
import { useCurrentUser } from "@/data/repository";

export function CompanyLayout({
  title = "Espace entreprise",
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  const user = useCurrentUser();
  const membership = useMyMembership();
  const company = useCurrentCompany();
  const conversations = useConversationsForCurrentUser();
  const allowed = (permission: Parameters<typeof can>[1]) => can(user, permission, membership);

  const nav: WorkspaceNavItem[] = [
    { to: "/company/dashboard", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
    ...(allowed("company.profile")
      ? [{ to: "/company/profil", label: "Mon entreprise", icon: Building2 }]
      : []),
    ...(allowed("company.catalogue")
      ? [{ to: "/company/produits", label: "Mes produits", icon: Package }]
      : []),
    {
      to: "/company/messages",
      label: "Messages",
      icon: MessageSquare,
      badge: conversations.length,
    },
    ...(allowed("company.statistics")
      ? [{ to: "/company/statistiques", label: "Statistiques", icon: TrendingUp }]
      : []),
    ...(allowed("company.members")
      ? [{ to: "/company/membres", label: "Membres", icon: ShieldCheck }]
      : []),
  ] as WorkspaceNavItem[];

  const location = useLocation();
  const current =
    nav.find((i) => location.pathname === i.to) ??
    nav.find((i) => location.pathname.startsWith(`${i.to}/`));

  return (
    <WorkspaceShell
      title={current?.label ?? title}
      eyebrow="Espace professionnel"
      organization={
        company
          ? { name: company.name, detail: company.businessSector }
          : { name: "Mon entreprise", detail: "Profil non renseigné" }
      }
      nav={nav}
    >
      {company && <CompanyRequestStatus company={company} />}
      {children ?? <Outlet />}
    </WorkspaceShell>
  );
}

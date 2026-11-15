// Navigation et coquille de l'espace client.
import { Outlet, useLocation } from "@tanstack/react-router";
import { Heart, LayoutDashboard, MessageSquare, ShoppingCart } from "lucide-react";
import { WorkspaceShell, type WorkspaceNavItem } from "@/components/layout/WorkspaceShell";
import { useCart, useFavorites } from "@/data/repository";
import { useCurrentUser } from "@/data/repository";

export function ClientLayout({ title = "Espace client" }: { title?: string }) {
  const cart = useCart();
  const favorites = useFavorites();
  const user = useCurrentUser();
  const unread = favorites.filter((f) => f.userId === user?.id).length;

  const nav: WorkspaceNavItem[] = [
    { to: "/client/dashboard", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
    {
      to: "/client/panier",
      label: "Mon panier",
      icon: ShoppingCart,
      badge: cart.items.reduce((n, i) => n + i.quantity, 0),
    },
    { to: "/client/favoris", label: "Mes favoris", icon: Heart, badge: unread },
    { to: "/client/messages", label: "Mes messages", icon: MessageSquare },
  ];

  const location = useLocation();
  const current =
    nav.find((i) => location.pathname === i.to) ??
    nav.find((i) => location.pathname.startsWith(`${i.to}/`));

  return (
    <WorkspaceShell title={current?.label ?? title} eyebrow="Espace client" nav={nav}>
      <Outlet />
    </WorkspaceShell>
  );
}

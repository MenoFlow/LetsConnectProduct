import { createFileRoute, Outlet } from "@tanstack/react-router";

// Coquille du catalogue public : la liste et la fiche produit s'affichent ici.
export const Route = createFileRoute("/produits")({
  component: Layout,
});

function Layout() {
  return <Outlet />;
}

import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/components/common";
import { requireRole } from "@/lib/guards";
import { AdminProductsPage } from "@/pages/admin/AdminProductsPage";

export const Route = createFileRoute("/admin/produits")({
  ssr: false,
  beforeLoad: requireRole(["ADMIN"], "admin.products"),
  head: () => pageHead("Produits", "Toutes les matières premières référencées sur la plateforme."),
  component: AdminProductsPage,
});

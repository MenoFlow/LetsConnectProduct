import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/components/common";
import { requireRole } from "@/lib/guards";
import { AdminCategoriesPage } from "@/pages/admin/AdminCategoriesPage";

export const Route = createFileRoute("/admin/categories")({
  ssr: false,
  beforeLoad: requireRole(["ADMIN"], "admin.categories"),
  head: () => pageHead("Catégories", "Gestion des catégories de matières premières."),
  component: AdminCategoriesPage,
});

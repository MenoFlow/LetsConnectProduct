import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/components/common";
import { requireRole } from "@/lib/guards";
import { AdminCompaniesPage } from "@/pages/admin/AdminCompaniesPage";

export const Route = createFileRoute("/admin/entreprises")({
  ssr: false,
  beforeLoad: requireRole(["ADMIN"], "admin.companies"),
  head: () => pageHead("Entreprises", "Validation, rejet, suspension et réactivation."),
  component: AdminCompaniesPage,
});

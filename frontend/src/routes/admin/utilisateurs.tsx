import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/components/common";
import { requireRole } from "@/lib/guards";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";

export const Route = createFileRoute("/admin/utilisateurs")({
  ssr: false,
  beforeLoad: requireRole(["ADMIN"], "admin.users"),
  head: () => pageHead("Utilisateurs", "Comptes, rôles et activation."),
  component: AdminUsersPage,
});

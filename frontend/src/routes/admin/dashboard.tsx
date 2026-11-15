import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/components/common";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => pageHead("Tableau de bord administratif", "Vue d’ensemble de la plateforme."),
  component: AdminDashboardPage,
});

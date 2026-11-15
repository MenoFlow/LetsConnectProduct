import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/components/common";
import { CompanyDashboardPage } from "@/pages/company/CompanyDashboardPage";

export const Route = createFileRoute("/company/dashboard")({
  head: () => pageHead("Tableau de bord", "Activité de votre entreprise sur MatérialConnect."),
  component: CompanyDashboardPage,
});

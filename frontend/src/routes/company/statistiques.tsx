import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/components/common";
import { requireRole } from "@/lib/guards";
import { CompanyStatisticsPage } from "@/pages/company/CompanyStatisticsPage";

export const Route = createFileRoute("/company/statistiques")({
  ssr: false,
  beforeLoad: requireRole(["COMPANY"], "company.statistics"),
  head: () => pageHead("Statistiques", "Fréquentation et activité de votre entreprise."),
  component: CompanyStatisticsPage,
});

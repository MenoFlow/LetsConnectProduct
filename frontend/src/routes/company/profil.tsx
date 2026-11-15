import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/components/common";
import { requireRole } from "@/lib/guards";
import { CompanyProfilePage } from "@/pages/company/CompanyProfilePage";

export const Route = createFileRoute("/company/profil")({
  ssr: false,
  beforeLoad: requireRole(["COMPANY"], "company.profile"),
  head: () => pageHead("Mon entreprise", "Renseignez les informations de votre entreprise."),
  component: CompanyProfilePage,
});

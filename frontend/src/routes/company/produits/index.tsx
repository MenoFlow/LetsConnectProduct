import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/components/common";
import { requireRole } from "@/lib/guards";
import { CompanyProductsPage } from "@/pages/company/CompanyProductsPage";

export const Route = createFileRoute("/company/produits/")({
  ssr: false,
  beforeLoad: requireRole(["COMPANY"], "company.catalogue"),
  head: () => pageHead("Mes produits", "Vos produits, prix, disponibilités et statuts."),
  component: CompanyProductsPage,
});

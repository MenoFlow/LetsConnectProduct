import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/components/common";
import { requireRole } from "@/lib/guards";
import { ProductEditPage } from "@/pages/company/ProductEditPage";

export const Route = createFileRoute("/company/produits/$id/modifier")({
  ssr: false,
  beforeLoad: requireRole(["COMPANY"], "company.products.write"),
  head: ({ params }) => pageHead(`Modifier le produit ${params.id}`, "Mettez à jour une fiche produit."),
  component: ProductEditPage,
});

import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/components/common";
import { requireRole } from "@/lib/guards";
import { ProductNewPage } from "@/pages/company/ProductNewPage";

export const Route = createFileRoute("/company/produits/nouveau")({
  ssr: false,
  beforeLoad: requireRole(["COMPANY"], "company.products.write"),
  head: () => pageHead("Nouveau produit", "Ajoutez une matière première à votre catalogue."),
  component: ProductNewPage,
});

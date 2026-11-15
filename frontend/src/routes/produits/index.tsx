import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/components/common";
import { CatalogPage } from "@/pages/public/CatalogPage";

export const Route = createFileRoute("/produits/")({
  head: () =>
    pageHead("Catalogue des produits", "Découvrez les matières premières proposées par les fournisseurs."),
  component: CatalogPage,
});

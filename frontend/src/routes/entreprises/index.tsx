import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/components/common";
import { CompaniesPage } from "@/pages/public/CompaniesPage";

export const Route = createFileRoute("/entreprises/")({
  head: () => pageHead("Entreprises", "Recherchez les entreprises et fournisseurs de matières premières."),
  component: CompaniesPage,
});

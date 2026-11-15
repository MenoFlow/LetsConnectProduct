import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/components/common";
import { InfoPage } from "@/pages/public/InfoPage";

export const Route = createFileRoute("/a-propos")({
  head: () =>
    pageHead("À propos", "La plateforme qui rapproche clients et fournisseurs de matières premières."),
  component: Page,
});

function Page() {
  return <InfoPage kind="a-propos" />;
}

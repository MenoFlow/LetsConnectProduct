import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/components/common";
import { InfoPage } from "@/pages/public/InfoPage";

export const Route = createFileRoute("/conditions")({
  head: () =>
    pageHead(
      "Conditions d’utilisation",
      "Les conditions de la sélection estimative MatérialConnect.",
    ),
  component: Page,
});

function Page() {
  return <InfoPage kind="conditions" />;
}

import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/components/common";
import { InfoPage } from "@/pages/public/InfoPage";

export const Route = createFileRoute("/confidentialite")({
  head: () =>
    pageHead("Politique de confidentialité", "Informations concernant vos données personnelles."),
  component: Page,
});

function Page() {
  return <InfoPage kind="confidentialite" />;
}

import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/components/common";
import { InfoPage } from "@/pages/public/InfoPage";

export const Route = createFileRoute("/contact")({
  head: () => pageHead("Contact", "Contactez l’équipe MatérialConnect."),
  component: Page,
});

function Page() {
  return <InfoPage kind="contact" />;
}

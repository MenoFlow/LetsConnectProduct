import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/components/common";
import { InfoPage } from "@/pages/public/InfoPage";

export const Route = createFileRoute("/faq")({
  head: () => pageHead("Questions fréquentes", "Les réponses à vos questions sur MatérialConnect."),
  component: Page,
});

function Page() {
  return <InfoPage kind="faq" />;
}

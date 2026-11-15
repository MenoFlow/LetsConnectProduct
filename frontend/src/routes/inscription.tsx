import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/components/common";
import { AuthPage } from "@/pages/public/AuthPage";

export const Route = createFileRoute("/inscription")({
  head: () =>
    pageHead("Inscription", "Rejoignez MatérialConnect en tant que client ou fournisseur."),
  component: Page,
});

function Page() {
  return <AuthPage signup />;
}

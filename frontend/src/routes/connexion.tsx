import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/components/common";
import { AuthPage } from "@/pages/public/AuthPage";

export const Route = createFileRoute("/connexion")({
  head: () => pageHead("Connexion", "Accédez à votre espace MatérialConnect."),
  component: Page,
});

function Page() {
  return <AuthPage />;
}

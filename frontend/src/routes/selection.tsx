import { createFileRoute, redirect } from "@tanstack/react-router";

// L'ancienne « sélection » est devenue le panier estimatif de l'espace client.
export const Route = createFileRoute("/selection")({
  beforeLoad: () => {
    throw redirect({ to: "/client/panier" });
  },
  component: () => null,
});

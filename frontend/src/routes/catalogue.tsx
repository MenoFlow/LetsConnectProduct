import { createFileRoute, redirect } from "@tanstack/react-router";

// L'ancien « mon catalogue » est devenu le catalogue de l'espace entreprise.
export const Route = createFileRoute("/catalogue")({
  beforeLoad: () => {
    throw redirect({ to: "/company/produits" });
  },
  component: () => null,
});

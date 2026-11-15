import { createFileRoute, redirect } from "@tanstack/react-router";

// L'ancien « espace entreprise » est devenu le tableau de bord de l'espace entreprise.
export const Route = createFileRoute("/espace-entreprise")({
  beforeLoad: () => {
    throw redirect({ to: "/company/dashboard" });
  },
  component: () => null,
});

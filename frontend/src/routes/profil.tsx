import { createFileRoute, redirect } from "@tanstack/react-router";

// L'ancien « profil » est devenu le profil de l'entreprise dans son espace.
export const Route = createFileRoute("/profil")({
  beforeLoad: () => {
    throw redirect({ to: "/company/profil" });
  },
  component: () => null,
});

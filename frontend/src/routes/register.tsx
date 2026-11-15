import { createFileRoute, redirect } from "@tanstack/react-router";

// Alias de la page d'inscription.
export const Route = createFileRoute("/register")({
  beforeLoad: () => {
    throw redirect({ to: "/inscription" });
  },
  component: () => null,
});

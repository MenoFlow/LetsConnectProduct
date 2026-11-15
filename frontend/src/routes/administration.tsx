import { createFileRoute, redirect } from "@tanstack/react-router";

// L'ancienne page d'administration est devenue le tableau de bord administrateur.
export const Route = createFileRoute("/administration")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/dashboard" });
  },
  component: () => null,
});

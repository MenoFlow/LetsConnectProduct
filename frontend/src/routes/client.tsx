import { createFileRoute } from "@tanstack/react-router";
import { ClientLayout } from "@/layouts/ClientLayout";
import { requireRole } from "@/lib/guards";

// Espace client : réservé aux comptes CLIENT. La garde est exécutée côté
// navigateur (la session vit dans le localStorage).
export const Route = createFileRoute("/client")({
  ssr: false,
  beforeLoad: requireRole(["CLIENT"]),
  component: () => <ClientLayout />,
});

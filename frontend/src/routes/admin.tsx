import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/layouts/AdminLayout";
import { requireRole } from "@/lib/guards";

// Espace administrateur : réservé au rôle ADMIN.
export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: requireRole(["ADMIN"], "admin.dashboard"),
  component: () => <AdminLayout />,
});

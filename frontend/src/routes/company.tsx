import { createFileRoute } from "@tanstack/react-router";
import { CompanyLayout } from "@/layouts/CompanyLayout";
import { requireRole } from "@/lib/guards";

// Espace entreprise : réservé aux comptes COMPANY liés à une entreprise.
export const Route = createFileRoute("/company")({
  ssr: false,
  beforeLoad: requireRole(["COMPANY"], "company.dashboard"),
  component: () => <CompanyLayout />,
});

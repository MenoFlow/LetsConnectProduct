import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/components/common";
import { requireRole } from "@/lib/guards";
import { CompanyMembersPage } from "@/pages/company/CompanyMembersPage";

export const Route = createFileRoute("/company/membres")({
  ssr: false,
  beforeLoad: requireRole(["COMPANY"], "company.members"),
  head: () => pageHead("Membres de l’entreprise", "Gérez les accès et les rôles internes."),
  component: CompanyMembersPage,
});

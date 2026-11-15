import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/components/common";
import { requireRole } from "@/lib/guards";
import { CompanyMessagesPage } from "@/pages/company/CompanyMessagesPage";

export const Route = createFileRoute("/company/messages")({
  ssr: false,
  beforeLoad: requireRole(["COMPANY"], "company.messages"),
  head: () => pageHead("Messages reçus", "Les demandes des clients et vos réponses."),
  component: CompanyMessagesPage,
});

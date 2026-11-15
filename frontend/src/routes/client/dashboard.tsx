import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/components/common";
import { ClientDashboardPage } from "@/pages/client/ClientDashboardPage";

export const Route = createFileRoute("/client/dashboard")({
  head: () => pageHead("Mon espace client", "Retrouvez vos entreprises, votre panier et vos messages."),
  component: ClientDashboardPage,
});

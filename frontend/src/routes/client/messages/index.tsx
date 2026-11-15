import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/components/common";
import { ClientMessagesPage } from "@/pages/client/ClientMessagesPage";

export const Route = createFileRoute("/client/messages/")({
  head: () => pageHead("Mes messages", "Vos échanges avec les entreprises."),
  component: ClientMessagesPage,
});

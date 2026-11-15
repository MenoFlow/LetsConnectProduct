import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/components/common";
import { ClientMessagePage } from "@/pages/client/ClientMessagePage";

export const Route = createFileRoute("/client/messages/$id")({
  head: ({ params }) => pageHead(`Conversation ${params.id}`, "Votre échange avec l’entreprise."),
  component: ClientMessagePage,
});

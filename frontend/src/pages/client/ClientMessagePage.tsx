import { notFound, useParams } from "@tanstack/react-router";
import { useConversations, useCurrentUser } from "@/data/repository";
import { ClientMessagesPage } from "./ClientMessagesPage";

export function ClientMessagePage() {
  const { id } = useParams({ from: "/client/messages/$id" });
  const user = useCurrentUser();
  const conversations = useConversations();
  if (!user) return null;
  const conversation = conversations.find((c) => c.id === id);
  if (!conversation || conversation.clientId !== user.id) throw notFound();
  return <ClientMessagesPage selectedId={id} />;
}

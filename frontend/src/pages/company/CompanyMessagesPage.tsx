import { useState } from "react";
import {
  useCurrentCompany,
  useCurrentUser,
  useConversationsForCurrentUser,
  useUsers,
  sendMessage,
} from "@/data/repository";
import { EmptyState } from "@/components/common";
import { ChatWorkspace } from "@/components/messaging/ChatWorkspace";

export function CompanyMessagesPage() {
  const company = useCurrentCompany();
  const user = useCurrentUser();
  const users = useUsers();
  const allConversations = useConversationsForCurrentUser();
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  if (!company || !user) {
    return (
      <main className="container page-main">
        <EmptyState title="Aucune entreprise rattachée" />
      </main>
    );
  }

  const contacts = allConversations
    .filter((conversation) => conversation.companyId === company.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((conversation) => {
      const client = users.find((u) => u.id === conversation.clientId);
      return {
        conversation,
        name: client ? `${client.firstName} ${client.lastName}` : "Client inconnu",
        ...(client ? { detail: client.email } : {}),
      };
    });

  return (
    <ChatWorkspace
      title="Conversations avec les clients"
      contacts={contacts}
      selectedId={selectedId}
      onSelect={setSelectedId}
      viewerId={user.id}
      badge="Client"
      onSend={(id, text) => sendMessage(id, text)}
      emptyTitle="Aucune demande reçue pour le moment"
      emptyText="Les messages des clients apparaîtront ici."
    />
  );
}

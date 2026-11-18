import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatWorkspace } from "@/components/messaging/ChatWorkspace";
import { resetStores } from "@/test/fixtures";

vi.mock("@/lib/realtime", () => ({ useRealtimeStatus: () => "connected" }));

const conversation = {
  id: "conversation-1",
  companyId: "company-1",
  clientId: "client-1",
  subject: "Demande de devis",
  createdAt: "2026-11-16T12:00:00.000Z",
  updatedAt: "2026-11-16T12:00:00.000Z",
};

describe("actions de conversation", () => {
  beforeEach(() => {
    resetStores();
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: () => {},
    });
  });

  it("permet de modifier l’objet après envoi", async () => {
    const onRename = vi.fn().mockResolvedValue(undefined);
    render(
      <ChatWorkspace
        title="Messages"
        contacts={[{ conversation, name: "Fournisseur" }]}
        selectedId={conversation.id}
        onSelect={vi.fn()}
        viewerId={conversation.clientId}
        onSend={vi.fn()}
        onRename={onRename}
        emptyTitle="Aucune conversation"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Modifier l’objet de la conversation" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Objet de la conversation" }), {
      target: { value: "Devis révisé" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => {
      expect(onRename).toHaveBeenCalledWith(conversation.id, "Devis révisé");
    });
  });

  it("demande confirmation avant de supprimer la conversation", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <ChatWorkspace
        title="Messages"
        contacts={[{ conversation, name: "Fournisseur" }]}
        selectedId={conversation.id}
        onSelect={vi.fn()}
        viewerId={conversation.clientId}
        onSend={vi.fn()}
        onDelete={onDelete}
        emptyTitle="Aucune conversation"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Supprimer la conversation" }));
    expect(screen.getByText(/Cette action supprimera la conversation/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Supprimer$/ }));

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith(conversation.id);
    });
  });
});

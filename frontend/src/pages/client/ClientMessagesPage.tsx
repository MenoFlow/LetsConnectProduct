import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Field } from "@/components/common";
import { errorMessage } from "@/lib/api";
import { ChatPrimaryButton, ChatWorkspace } from "@/components/messaging/ChatWorkspace";
import {
  useCurrentUser,
  useCompanies,
  usePublicCompanies,
  useConversationsForCurrentUser,
  renameConversation,
  deleteConversation,
  sendMessage,
  startConversation,
} from "@/data/repository";

export function ClientMessagesPage({ selectedId }: { selectedId?: string } = {}) {
  const user = useCurrentUser();
  const companies = useCompanies();
  const publicCompanies = usePublicCompanies();
  const conversations = useConversationsForCurrentUser();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [companyId, setCompanyId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!user) return null;

  const sortedConversations = [...conversations].sort(
    (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  );
  const validCompany = publicCompanies.some(
    (company) => company.id === companyId,
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || submitting || !validCompany || !subject.trim() || !body.trim()) {
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const id = await startConversation({
        companyId,
        clientId: user.id,
        subject: subject.trim(),
        body: body.trim(),
      });
      setOpen(false);
      setCompanyId("");
      setSubject("");
      setBody("");
      await navigate({ to: "/client/messages/$id", params: { id } });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <ChatWorkspace
        title="Conversations avec les fournisseurs"
        action={<ChatPrimaryButton onClick={() => setOpen(true)}>Nouveau message</ChatPrimaryButton>}
        contacts={sortedConversations.map((conversation) => {
          const company = companies.find((item) => item.id === conversation.companyId);
          return {
            conversation,
            name: company?.name ?? "Entreprise indisponible",
            ...(company ? { detail: company.city } : {}),
          };
        })}
        selectedId={selectedId}
        onSelect={(id) => navigate({ to: "/client/messages/$id", params: { id } })}
        viewerId={user.id}
        badge="Fournisseur"
        onSend={(id, text) => sendMessage(id, text)}
        onRename={(id, nextSubject) => renameConversation(id, nextSubject)}
        onDelete={async (id) => {
          await deleteConversation(id);
          await navigate({ to: "/client/messages" });
        }}
        emptyTitle="Aucune conversation"
        emptyText="Créez un message pour contacter une entreprise."
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau message</DialogTitle>
            <DialogDescription>
              Sélectionnez une entreprise et décrivez votre demande.
            </DialogDescription>
          </DialogHeader>
          {publicCompanies.length === 0 && (
            <p className="text-muted-foreground">
              Aucune entreprise publique n'est disponible actuellement.
            </p>
          )}
          <form className="form-grid" onSubmit={submit}>
            <div className="form-full">
              <Field label="Entreprise">
                <select
                  required
                  value={companyId}
                  onChange={(event) => setCompanyId(event.target.value)}
                >
                  <option value="">Sélectionner une entreprise</option>
                  {publicCompanies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name} — {company.city}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="form-full">
              <Field label="Objet">
                <input
                  required
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                />
              </Field>
            </div>
            <div className="form-full">
              <Field label="Message">
                <textarea
                  required
                  rows={5}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                />
              </Field>
            </div>
            <div className="form-actions form-full">
              {error && (
                <p className="form-error form-full" role="alert">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                disabled={
                  submitting || !validCompany || !subject.trim() || !body.trim()
                }
              >
                {submitting ? "Envoi en cours…" : "Envoyer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

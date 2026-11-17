// Messagerie en deux colonnes (contacts + conversation), partagée par les
// espaces client et entreprise. Les données viennent du dépôt via les props ;
// l'envoi attend la réponse du serveur.
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { ArrowLeft, CheckCheck, MessageSquare, Pencil, Search, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMessages } from "@/data/repository";
import { errorMessage } from "@/lib/api";
import { useRealtimeStatus } from "@/lib/realtime";
import type { Conversation } from "@/types";

export interface ChatContact {
  conversation: Conversation;
  name: string;
  detail?: string;
}

interface ChatWorkspaceProps {
  title: string;
  action?: ReactNode;
  contacts: ChatContact[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  viewerId: string;
  badge?: string;
  /** Doit renvoyer la promesse de l'envoi : l'écran attend et affiche l'erreur. */
  onSend: (conversationId: string, body: string) => Promise<unknown> | void;
  onRename?: (conversationId: string, subject: string) => Promise<unknown>;
  onDelete?: (conversationId: string) => Promise<unknown>;
  emptyTitle: string;
  emptyText?: string;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Aujourd’hui";
  if (date.toDateString() === yesterday.toDateString()) return "Hier";
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function Avatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-xl bg-chat-peach font-semibold text-foreground ${
        size === "lg" ? "size-12 text-base" : "size-11 text-sm"
      }`}
    >
      {initials(name) || "?"}
    </span>
  );
}

export function ChatWorkspace({
  title,
  action,
  contacts,
  selectedId,
  onSelect,
  viewerId,
  badge,
  onSend,
  onRename,
  onDelete,
  emptyTitle,
  emptyText,
}: ChatWorkspaceProps) {
  const allMessages = useMessages();
  const realtimeStatus = useRealtimeStatus();
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [subjectDraft, setSubjectDraft] = useState("");
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState("");
  const [showConversation, setShowConversation] = useState(Boolean(selectedId));
  const streamRef = useRef<HTMLDivElement>(null);

  const selected = contacts.find((c) => c.conversation.id === selectedId) ?? contacts[0];
  const messagesOf = (id: string) =>
    allMessages
      .filter((m) => m.conversationId === id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const messages = selected ? messagesOf(selected.conversation.id) : [];
  const draft = selected ? (drafts[selected.conversation.id] ?? "") : "";

  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight });
  }, [selected?.conversation.id, messages.length]);

  useEffect(() => {
    if (selectedId) setShowConversation(true);
  }, [selectedId]);

  const query = search.trim().toLocaleLowerCase("fr");
  const filtered = contacts.filter((c) =>
    `${c.name} ${c.conversation.subject}`.toLocaleLowerCase("fr").includes(query),
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !draft.trim() || sending) return;
    const conversationId = selected.conversation.id;
    setSending(true);
    setSendError("");
    try {
      await onSend(conversationId, draft.trim());
      setDrafts((d) => ({ ...d, [conversationId]: "" }));
    } catch (error) {
      // Le brouillon reste en place : l'utilisateur peut relancer l'envoi.
      setSendError(errorMessage(error));
    } finally {
      setSending(false);
    }
  };

  const rename = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !onRename || !subjectDraft.trim() || actionPending) return;
    setActionPending(true);
    setActionError("");
    try {
      await onRename(selected.conversation.id, subjectDraft.trim());
      setRenameOpen(false);
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setActionPending(false);
    }
  };

  const remove = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!selected || !onDelete || actionPending) return;
    setActionPending(true);
    setActionError("");
    try {
      await onDelete(selected.conversation.id);
      setDeleteOpen(false);
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setActionPending(false);
    }
  };

  return (
    <main className="chat-fill flex h-full min-h-0 flex-col overflow-hidden bg-chat-canvas p-3 sm:p-4 lg:p-6">
      <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-foreground">{title}</h1>
          {realtimeStatus !== "connected" && (
            <p className="text-xs text-muted-foreground" role="status">
              {realtimeStatus === "error"
                ? "Connexion temps réel indisponible. Reconnexion en cours…"
                : "Connexion temps réel…"}
            </p>
          )}
        </div>
        {action}
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] gap-5 lg:grid-cols-12">
        {/* Contacts */}
        <section
          aria-label="Contacts"
          className={`${showConversation ? "hidden lg:flex" : "flex"} min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card p-4 shadow-sm lg:col-span-4`}
        >
          <div className="mb-4 flex items-center justify-between px-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Contacts</h2>
            <span className="text-base font-medium text-muted-foreground">{contacts.length}</span>
          </div>
          <label className="relative mb-4 block">
            <span className="sr-only">Rechercher une conversation</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher"
              className="w-full rounded-xl border border-border bg-card py-2.5 pl-11 pr-4 text-sm placeholder:text-muted-foreground focus:border-chat-brand focus:outline-none focus:ring-1 focus:ring-chat-brand"
            />
          </label>
          <ul className="chat-scroll min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
            {filtered.map((contact) => {
              const active = contact.conversation.id === selected?.conversation.id;
              const list = messagesOf(contact.conversation.id);
              const last = list[list.length - 1];
              const unread = list.filter((m) => m.senderUserId !== viewerId && !m.readAt).length;
              return (
                <li key={contact.conversation.id}>
                  <Button
                    variant="ghost"
                    type="button"
                    aria-current={active ? "true" : undefined}
                    onClick={() => { onSelect(contact.conversation.id); setShowConversation(true); }}
                    className={`flex h-auto w-full items-center gap-3.5 whitespace-normal rounded-lg p-3 text-left transition-colors ${
                      active ? "border-r-4 border-chat-brand bg-muted" : "hover:bg-muted"
                    }`}
                  >
                    <Avatar name={contact.name} />
                    <span className="min-w-0 flex-1">
                      <span className="mb-1 flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">{contact.name}</span>
                        {unread > 0 && !active && (
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-highlight text-[11px] font-bold text-foreground">
                            {unread}
                          </span>
                        )}
                      </span>
                      <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="truncate">{last?.body ?? contact.conversation.subject}</span>
                        <span className="whitespace-nowrap text-[11px]">
                          {time(last?.createdAt ?? contact.conversation.updatedAt)}
                        </span>
                      </span>
                    </span>
                  </Button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                {contacts.length === 0 ? "Aucune conversation" : "Aucun résultat"}
              </li>
            )}
          </ul>
        </section>

        {/* Conversation */}
        <section
          aria-label="Conversation"
          className={`${showConversation ? "flex" : "hidden lg:flex"} min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm lg:col-span-8`}
        >
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-chat-peach">
                <MessageSquare className="size-6" />
              </span>
              <strong className="text-foreground">{emptyTitle}</strong>
              {emptyText && <p className="max-w-sm text-sm text-muted-foreground">{emptyText}</p>}
            </div>
          ) : (
            <>
              <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-3 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" aria-label="Retour aux contacts" onClick={() => setShowConversation(false)}>
                    <ArrowLeft />
                  </Button>
                  <Avatar name={selected.name} size="lg" />
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-bold leading-tight text-foreground">{selected.name}</h2>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {selected.conversation.subject}
                    </p>
                  </div>
                </div>
                <div className="hidden shrink-0 items-center gap-4 text-xs xl:flex">
                  {badge && (
                    <span className="rounded-lg bg-chat-peach px-3 py-1 font-medium text-foreground">{badge}</span>
                  )}
                  {selected.detail && <span className="font-medium text-muted-foreground">{selected.detail}</span>}
                </div>
                {(onRename || onDelete) && (
                  <div className="flex shrink-0 items-center gap-1">
                    {onRename && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Modifier l’objet de la conversation"
                        onClick={() => {
                          setSubjectDraft(selected.conversation.subject);
                          setActionError("");
                          setRenameOpen(true);
                        }}
                      >
                        <Pencil />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Supprimer la conversation"
                        onClick={() => {
                          setActionError("");
                          setDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="text-destructive" />
                      </Button>
                    )}
                  </div>
                )}
              </header>

              <div
                ref={streamRef}
                className="chat-scroll min-h-0 flex-1 space-y-4 overflow-y-auto p-3 sm:p-6"
                aria-live="polite"
              >
                {messages.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground">Aucun message pour le moment.</p>
                )}
                {messages.map((message, index) => {
                  const own = message.senderUserId === viewerId;
                  const prev = messages[index - 1];
                  const newDay =
                    !prev || new Date(prev.createdAt).toDateString() !== new Date(message.createdAt).toDateString();
                  return (
                    <div key={message.id} className="space-y-4">
                      {newDay && (
                        <div className="my-2 flex justify-center">
                          <span className="rounded-lg bg-muted px-3.5 py-1 text-xs font-medium text-muted-foreground">
                            {dayLabel(message.createdAt)}
                          </span>
                        </div>
                      )}
                      <div className={`flex flex-col space-y-1 ${own ? "items-end" : "items-start"}`}>
                        <div
                          className={`max-w-md whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                            own
                              ? "rounded-tr-sm bg-chat-peach font-medium text-foreground"
                              : "rounded-tl-sm bg-chat-brand text-chat-brand-foreground shadow-sm"
                          }`}
                        >
                          {message.body}
                        </div>
                        <div className={`flex items-center gap-1 text-[11px] text-muted-foreground ${own ? "pr-1" : "pl-1"}`}>
                          <time dateTime={message.createdAt}>{time(message.createdAt)}</time>
                          {own && <CheckCheck className="size-3.5 text-chat-brand" aria-label="Envoyé" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={submit} className="shrink-0 border-t border-border p-3 sm:p-4">
                {sendError && (
                  <p className="mb-2 text-xs font-medium text-destructive" role="alert">
                    {sendError}
                  </p>
                )}
                <div className="flex items-center gap-3 rounded-2xl border border-border px-3 py-2 focus-within:border-chat-brand focus-within:ring-1 focus-within:ring-chat-brand">
                  <label className="sr-only" htmlFor="chat-input">Votre message</label>
                  <input
                    id="chat-input"
                    value={draft}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [selected.conversation.id]: e.target.value }))
                    }
                    placeholder="Votre message"
                    autoComplete="off"
                    className="min-w-0 flex-1 border-0 bg-transparent py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                  <Button
                    variant="ghost"
                    type="submit"
                    disabled={!draft.trim() || sending}
                    className="flex shrink-0 items-center gap-2 rounded-lg bg-chat-peach px-3 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-chat-peach-strong active:scale-95 disabled:opacity-50"
                  >
                    <span>{sending ? "Envoi…" : "Envoyer"}</span>
                    {!sending && <Send className="size-4" />}
                  </Button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
      <Dialog
        open={renameOpen}
        onOpenChange={(open) => {
          if (!actionPending) setRenameOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l’objet</DialogTitle>
            <DialogDescription>
              Le nouvel objet sera visible par tous les participants.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={rename} className="space-y-4">
            <label className="block space-y-2 text-sm font-medium" htmlFor="conversation-subject">
              Objet de la conversation
              <input
                id="conversation-subject"
                required
                maxLength={200}
                value={subjectDraft}
                onChange={(event) => setSubjectDraft(event.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal"
              />
            </label>
            {actionError && <p className="text-sm text-destructive" role="alert">{actionError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={actionPending} onClick={() => setRenameOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={actionPending || !subjectDraft.trim()}>
                {actionPending ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!actionPending) setDeleteOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette conversation ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera la conversation et ses messages pour tous les participants. Elle est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {actionError && <p className="text-sm text-destructive" role="alert">{actionError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionPending}
              onClick={(event) => void remove(event)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionPending ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

export function ChatPrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button
      variant="ghost"
      type="button"
      {...props}
      className="flex shrink-0 items-center justify-center rounded-lg bg-chat-brand px-3 py-2.5 text-sm font-medium text-chat-brand-foreground shadow-md transition-all hover:bg-chat-brand hover:text-chat-brand-foreground hover:opacity-90 active:scale-[0.98]"
    />
  );
}

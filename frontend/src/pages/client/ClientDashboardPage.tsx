import { Link } from "@tanstack/react-router";
import { EmptyState, SectionHeading } from "@/components/common";
import {
  useCurrentUser,
  useCart,
  useProducts,
  useCompanies,
  useFavorites,
  useConversationsForCurrentUser,
  listMessagesOf,
  cartLines,
  cartItemCount,
  cartTotal,
} from "@/data/repository";
import { formatDateTime, formatPrice } from "@/lib/format";

export function ClientDashboardPage() {
  const user = useCurrentUser();
  const cart = useCart();
  useProducts();
  const companies = useCompanies();
  const favorites = useFavorites();
  const conversations = useConversationsForCurrentUser();

  if (!user) return null;

  const lines = cartLines(cart);
  const favoriteIds = new Set(
    favorites.filter((favorite) => favorite.userId === user.id)
      .map((favorite) => favorite.companyId),
  );
  const favoriteCompanies = companies.filter((company) =>
    favoriteIds.has(company.id),
  );
  const recentConversations = [...conversations]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 3);
  const metrics = [
    ["Produits au panier", cartItemCount(lines)],
    ["Total estimatif du panier", formatPrice(cartTotal(lines))],
    ["Entreprises favorites", favoriteCompanies.length],
    ["Conversations", conversations.length],
  ];

  return (
    <main className="container page-main">
      <header className="page-head">
        <div>
          <h1 className="page-title">Bonjour {user.firstName}</h1>
          <p className="page-subtitle">
            Retrouvez vos fournisseurs, votre panier et vos échanges.
          </p>
        </div>
      </header>

      <div className="kpi-grid">
        {metrics.map(([label, value]) => (
          <article className="kpi-card" key={label}>
            <p className="kpi-label">{label}</p>
            <strong className="text-2xl">{value}</strong>
          </article>
        ))}
      </div>

      <section className="workspace-band">
        <SectionHeading
          title="Mes entreprises favorites"
          action={
            <Link className="text-link" to="/client/favoris">
              Voir tous mes favoris
            </Link>
          }
        />
        {favoriteCompanies.length === 0 ? (
          <EmptyState
            compact
            title="Aucune entreprise favorite"
            description="Enregistrez des fournisseurs pour les retrouver ici."
          />
        ) : (
          favoriteCompanies.slice(0, 3).map((company) => (
            <div className="member-row" key={company.id}>
              <div>
                <strong>{company.name}</strong>
                <p className="text-muted-foreground">
                  {company.businessSector} · {company.city}
                </p>
              </div>
              <Link
                className="text-link"
                to="/entreprises/$id"
                params={{ id: company.id }}
              >
                Voir la fiche
              </Link>
            </div>
          ))
        )}
      </section>

      <section className="workspace-band">
        <SectionHeading title="Derniers messages" />
        {recentConversations.length === 0 ? (
          <EmptyState
            compact
            title="Aucune conversation"
            description="Vos échanges avec les fournisseurs apparaîtront ici."
          />
        ) : (
          recentConversations.map((conversation) => {
            const messages = listMessagesOf(conversation.id);
            const lastMessage = messages[messages.length - 1];
            const company = companies.find(
              (item) => item.id === conversation.companyId,
            );

            return (
              <article className="member-row" key={conversation.id}>
                <div className="min-w-0">
                  <Link
                    className="text-link"
                    to="/client/messages/$id"
                    params={{ id: conversation.id }}
                  >
                    {conversation.subject}
                  </Link>
                  <p>{company?.name ?? "Entreprise indisponible"}</p>
                  <p className="text-muted-foreground">
                    {lastMessage?.body.slice(0, 160) ?? "Aucun message"}
                  </p>
                  <time dateTime={conversation.updatedAt}>
                    {formatDateTime(conversation.updatedAt)}
                  </time>
                </div>
              </article>
            );
          })
        )}
      </section>

      <section className="workspace-band">
        <SectionHeading
          title="Panier en cours"
          action={
            <Link className="text-link" to="/client/panier">
              Ouvrir mon panier
            </Link>
          }
        />
        {lines.length === 0 ? (
          <EmptyState compact title="Votre panier est vide" />
        ) : (
          lines.slice(0, 3).map((line) => (
            <div className="member-row" key={line.id}>
              <div>
                <strong>{line.product.name}</strong>
                <p className="text-muted-foreground">
                  {line.company?.name ?? "Fournisseur indisponible"}
                  {" · "}
                  {line.quantity} {line.product.unit}
                </p>
              </div>
              <strong>{formatPrice(line.lineTotal)}</strong>
            </div>
          ))
        )}
      </section>
    </main>
  );
}

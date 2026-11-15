import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  CompanyStatusBadge,
  EmptyState,
  SectionHeading,
} from "@/components/common";
import {
  useCompanies,
  useConversations,
  useFavorites,
  useProducts,
  useUsers,
} from "@/data/repository";
import { formatDate } from "@/lib/format";
import type { CompanyStatus } from "@/types";

const statuses: CompanyStatus[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
];

export function AdminDashboardPage() {
  const users = useUsers();
  const companies = useCompanies();
  const products = useProducts();
  const favorites = useFavorites();
  const conversations = useConversations();

  const pending = companies.filter((company) => company.status === "PENDING");
  const metrics = [
    { label: "Utilisateurs", value: users.length },
    { label: "Entreprises", value: companies.length },
    { label: "Produits", value: products.length },
    { label: "Inscriptions en attente", value: pending.length },
  ];

  return (
    <main className="container page-main">
      <header className="page-head">
        <div>
          <h1 className="page-title">Tableau de bord administratif</h1>
          <p className="page-subtitle">
            Vue d’ensemble de la plateforme.
          </p>
        </div>
      </header>

      <section className="kpi-grid" aria-label="Indicateurs administratifs">
        {metrics.map((metric) => (
          <article className="kpi-card" key={metric.label}>
            <h2 className="kpi-label">{metric.label}</h2>
            <strong className="text-2xl">{metric.value}</strong>
          </article>
        ))}
      </section>

      <section className="workspace-band">
        <SectionHeading title="Répartition des entreprises par statut" />
        <div className="kpi-grid">
          {statuses.map((status) => (
            <article className="kpi-card" key={status}>
              <CompanyStatusBadge status={status} />
              <p className="text-2xl font-semibold">
                {companies.filter((company) => company.status === status).length}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="workspace-band">
        <SectionHeading title="Entreprises à valider" />
        {pending.length === 0 ? (
          <EmptyState
            title="Aucune entreprise en attente"
            description="Toutes les inscriptions ont été traitées."
            compact
          />
        ) : (
          <ul>
            {pending.map((company) => (
              <li className="member-row" key={company.id}>
                <div>
                  <strong>{company.name}</strong>
                  <p className="text-muted-foreground">
                    {company.businessSector} · {company.city}
                  </p>
                  <p className="text-muted-foreground">
                    Inscription le {formatDate(company.createdAt)}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/entreprises">Traiter</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="workspace-band">
        <SectionHeading title="Activité de la plateforme" />
        <div className="kpi-grid kpi-grid-2">
          <article className="kpi-card">
            <h3 className="kpi-label">Favoris</h3>
            <strong className="text-2xl">{favorites.length}</strong>
          </article>
          <article className="kpi-card">
            <h3 className="kpi-label">Conversations</h3>
            <strong className="text-2xl">{conversations.length}</strong>
          </article>
        </div>
      </section>
    </main>
  );
}

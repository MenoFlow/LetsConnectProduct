// Écran administrateur — Tableau de bord : indicateurs, files de modération et
// activité. Les inscriptions en attente se traitent ici même, sans changer d'écran.
import { ArrowUpRight, Building2, Clock, Package, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  CompanyStatusBadge,
  EmptyState,
  SectionHeading,
} from "@/components/common";
import { AdminKpi } from "@/components/common/AdminUI";
import { useCompanyDecision } from "@/components/common/CompanyDecision";
import {
  useCompanies,
  useConversations,
  useFavorites,
  useProducts,
  useUsers,
} from "@/data/repository";
import { formatDate } from "@/lib/format";
import type { CompanyStatus } from "@/types";

const statuses: CompanyStatus[] = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"];

export function AdminDashboardPage() {
  const users = useUsers();
  const companies = useCompanies();
  const products = useProducts();
  const favorites = useFavorites();
  const conversations = useConversations();
  const { decide, askReason, dialog, busy } = useCompanyDecision();

  const pending = companies.filter((company) => company.status === "PENDING");
  const metrics = [
    { label: "Utilisateurs", value: users.length, icon: Users, path: "/admin/utilisateurs" as const },
    { label: "Entreprises", value: companies.length, icon: Building2, path: "/admin/entreprises" as const },
    { label: "Produits", value: products.length, icon: Package, path: "/admin/produits" as const },
    {
      label: "Inscriptions en attente",
      value: pending.length,
      icon: Clock,
      path: "/admin/entreprises" as const,
    },
  ];

  return (
    <main className="workspace-page">
      {dialog}

      <section className="kpi-grid" aria-label="Indicateurs administratifs">
        {metrics.map((metric) => (
          <Link
            className="kpi-card admin-metric"
            key={metric.label}
            to={metric.path}
            search={
              metric.label === "Inscriptions en attente" ? { status: "PENDING" } : {}
            }
          >
            <AdminKpi
              label={metric.label}
              value={metric.value}
              icon={metric.icon}
              linked
            />
          </Link>
        ))}
      </section>

      <div className="admin-dashboard-grid">
        <section className="workspace-band">
          <SectionHeading
            title="État des entreprises"
            subtitle={`${companies.length} entreprises au total`}
          />
          <ul className="admin-status-list">
            {statuses.map((status) => {
              const count = companies.filter(
                (company) => company.status === status,
              ).length;
              return (
                <li key={status}>
                  <div>
                    <CompanyStatusBadge status={status} />
                    <strong>{count}</strong>
                  </div>
                  <progress
                    max={Math.max(1, companies.length)}
                    value={count}
                    aria-label={`Entreprises ${status}`}
                  />
                </li>
              );
            })}
          </ul>
        </section>

        <section className="workspace-band">
          <SectionHeading
            title="Demandes à examiner"
            subtitle={`${pending.length} en attente`}
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to="/admin/entreprises" search={{ status: "PENDING" }}>
                  Voir toutes
                  <ArrowUpRight />
                </Link>
              </Button>
            }
          />
          {pending.length === 0 ? (
            <EmptyState
              title="Aucune entreprise en attente"
              description="Toutes les inscriptions ont été traitées."
              compact
            />
          ) : (
            <ul className="admin-pending-list">
              {pending.slice(0, 4).map((company) => (
                <li className="admin-pending-row" key={company.id}>
                  <div>
                    <strong>{company.name}</strong>
                    <p className="text-muted-foreground">
                      {company.businessSector} · {company.city}
                    </p>
                    <p className="text-muted-foreground">
                      Inscription le {formatDate(company.createdAt)}
                    </p>
                  </div>
                  <div className="admin-pending-actions">
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => void decide(company, "APPROVED")}
                    >
                      Approuver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => askReason(company, "REJECTED")}
                    >
                      Rejeter
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {pending.length > 4 && (
            <p className="form-help">
              {pending.length - 4} autre{pending.length - 4 > 1 ? "s" : ""} demande
              {pending.length - 4 > 1 ? "s" : ""} à traiter dans l’écran
              Entreprises.
            </p>
          )}
        </section>
      </div>

      <section className="workspace-band">
        <SectionHeading title="Activité de la plateforme" subtitle="Totaux cumulés" />
        <div className="kpi-grid kpi-grid-2">
          <article className="kpi-card">
            <AdminKpi label="Favoris" value={favorites.length} />
          </article>
          <article className="kpi-card">
            <AdminKpi label="Conversations" value={conversations.length} />
          </article>
        </div>
      </section>
    </main>
  );
}

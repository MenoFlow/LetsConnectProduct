// Écran administrateur — Entreprises : validation, rejet, suspension, réactivation.
// Barre d'outils unique, motif de décision visible et confirmation modale pour
// toute action défavorable.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CompanyStatusBadge,
  Field,
} from "@/components/common";
import {
  AdminToolbar,
  RowActions,
  useAdminPagination,
} from "@/components/common/AdminUI";
import { useCompanyDecision } from "@/components/common/CompanyDecision";
import {
  getUser,
  useCompanies,
  useProducts,
  useUsers,
} from "@/data/repository";
import { formatDate } from "@/lib/format";
import type { CompanyStatus } from "@/types";

const statuses: { value: CompanyStatus; label: string }[] = [
  { value: "PENDING", label: "En attente" },
  { value: "APPROVED", label: "Approuvées" },
  { value: "REJECTED", label: "Rejetées" },
  { value: "SUSPENDED", label: "Suspendues" },
];

export function AdminCompaniesPage() {
  const companies = useCompanies();
  const products = useProducts();
  // Maintient également les noms des propriétaires à jour.
  const users = useUsers();
  const { decide, askReason, dialog, busy } = useCompanyDecision();
  const [search, setSearch] = useState(
    () => new URLSearchParams(window.location.search).get("company") ?? "",
  );
  const [status, setStatus] = useState(
    () => new URLSearchParams(window.location.search).get("status") ?? "",
  );

  const query = search.trim().toLocaleLowerCase("fr");
  const pending = companies.filter((company) => company.status === "PENDING");
  const results = companies.filter(
    (company) =>
      (!status || company.status === status) &&
      `${company.name} ${company.city} ${company.businessSector}`
        .toLocaleLowerCase("fr")
        .includes(query),
  );

  const pagination = useAdminPagination(results, `${search}|${status}`);

  return (
    <main className="workspace-page">
      {dialog}

      <AdminToolbar
        search={search}
        onSearch={setSearch}
        searchLabel="Rechercher une entreprise"
        placeholder="Nom, ville ou secteur"
        total={results.length}
        onReset={() => {
          setSearch("");
          setStatus("");
        }}
        actions={
          <Button
            size="sm"
            variant={status === "PENDING" ? "default" : "outline"}
            onClick={() => setStatus(status === "PENDING" ? "" : "PENDING")}
          >
            En attente · {pending.length}
          </Button>
        }
        filters={
          <Field label="Statut">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">Tous</option>
              {statuses.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
        }
      />

      <div className="admin-table-scroll" tabIndex={0} aria-label="Liste défilante">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Entreprise</th>
              <th scope="col">Secteur</th>
              <th scope="col">Propriétaire</th>
              <th scope="col">Statut</th>
              <th scope="col">Vérifiée</th>
              <th scope="col">Produits</th>
              <th scope="col">Inscription</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagination.rows.map((company) => {
              const owner =
                users.find((user) => user.id === company.ownerId) ??
                getUser(company.ownerId);

              return (
                <tr key={company.id}>
                  <td>
                    <strong>{company.name}</strong>
                    <p className="text-muted-foreground">{company.city}</p>
                    {company.reviewNote && (
                      <p className="form-help">Motif : {company.reviewNote}</p>
                    )}
                  </td>
                  <td>{company.businessSector}</td>
                  <td>
                    {owner
                      ? `${owner.firstName} ${owner.lastName}`
                      : "Propriétaire introuvable"}
                  </td>
                  <td>
                    <CompanyStatusBadge status={company.status} />
                  </td>
                  <td>{company.isVerified ? "Oui" : "Non"}</td>
                  <td>
                    {products.filter((p) => p.companyId === company.id).length}
                  </td>
                  <td>{formatDate(company.createdAt)}</td>
                  <td>
                    <div className="table-actions">
                      {(company.status === "PENDING" ||
                        company.status === "REJECTED") && (
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => void decide(company, "APPROVED")}
                        >
                          Valider
                        </Button>
                      )}
                      {(company.status === "PENDING" ||
                        company.status === "APPROVED") && (
                        <RowActions
                          name={company.name}
                          disabled={busy}
                          items={[
                            {
                              label:
                                company.status === "PENDING"
                                  ? "Rejeter"
                                  : "Suspendre",
                              destructive: true,
                              action: () =>
                                askReason(
                                  company,
                                  company.status === "PENDING"
                                    ? "REJECTED"
                                    : "SUSPENDED",
                                ),
                            },
                          ]}
                        />
                      )}
                      {company.status === "SUSPENDED" && (
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => void decide(company, "APPROVED")}
                        >
                          Réactiver
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {results.length === 0 && (
              <tr>
                <td className="empty-table" colSpan={8}>
                  Aucune entreprise ne correspond aux filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination.control}
    </main>
  );
}

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  CompanyStatusBadge,
  EmptyState,
  Field,
  SectionHeading,
} from "@/components/common";
import {
  getUser,
  setCompanyStatus,
  useCompanies,
  useProducts,
  useUsers,
} from "@/data/repository";
import { formatDate, pluralize } from "@/lib/format";
import { errorMessage } from "@/lib/api";
import type { Company, CompanyStatus } from "@/types";

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
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [rejecting, setRejecting] = useState<{ company: Company; next: CompanyStatus } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  // La décision est enregistrée côté serveur : on n'affiche la confirmation
  // qu'après la réponse, et le motif de refus est communiqué à l'entreprise.
  async function decide(
    company: Company,
    next: CompanyStatus,
    note?: string,
  ): Promise<boolean> {
    if (busy) return false;
    setBusy(true);
    try {
      await setCompanyStatus(company.id, next, note);
      const messages: Record<CompanyStatus, string> = {
        APPROVED: `${company.name} est validée et visible publiquement.`,
        REJECTED: `La demande de ${company.name} est refusée. L’entreprise verra le motif.`,
        SUSPENDED: `${company.name} est suspendue et masquée du catalogue.`,
        PENDING: `${company.name} est remise en attente.`,
      };
      toast.success(messages[next]);
      return true;
    } catch (cause) {
      toast.error(errorMessage(cause));
      return false;
    } finally {
      setBusy(false);
    }
  }
  const askReason = (company: Company, next: CompanyStatus) => {
    setReason("");
    setRejecting({ company, next });
  };

  const query = search.trim().toLocaleLowerCase("fr");
  const pending = companies.filter((company) => company.status === "PENDING");
  const results = companies.filter(
    (company) =>
      (!status || company.status === status) &&
      `${company.name} ${company.city} ${company.businessSector}`
        .toLocaleLowerCase("fr")
        .includes(query),
  );

  return (
    <main className="container page-main">
      <header className="page-head">
        <h1 className="page-title">Entreprises</h1>
      </header>

      {rejecting && (
        <section className="workspace-band" aria-label="Motif de la décision">
          <form
            className="space-y-3"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!reason.trim() || busy) return;
              const saved = await decide(rejecting.company, rejecting.next, reason);
              if (saved) setRejecting(null);
            }}
          >
            <strong>
              {rejecting.next === "REJECTED" ? "Refuser" : "Suspendre"} {rejecting.company.name}
            </strong>
            <Field label="Motif communiqué à l’entreprise">
              <textarea
                required
                autoFocus
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ex. : documents incomplets, coordonnées à préciser…"
              />
            </Field>
            <div className="table-actions">
              <Button type="submit" size="sm" disabled={!reason.trim() || busy}>
                {busy ? "Enregistrement…" : "Confirmer"}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setRejecting(null)}>
                Annuler
              </Button>
            </div>
          </form>
        </section>
      )}

      <div className="filters">
        <Field label="Rechercher une entreprise">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nom, ville ou secteur"
          />
        </Field>
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
      </div>

      <p role="status">{pluralize(results.length, "résultat", "résultats")}</p>
      <div className="overflow-x-auto">
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
            {results.map((company) => {
              const owner =
                users.find((user) => user.id === company.ownerId) ??
                getUser(company.ownerId);

              return (
                <tr key={company.id}>
                  <td>
                    <strong>{company.name}</strong>
                    <p className="text-muted-foreground">{company.city}</p>
                  </td>
                  <td>{company.businessSector}</td>
                  <td>
                    {owner
                      ? `${owner.firstName} ${owner.lastName}`
                      : "Propriétaire introuvable"}
                  </td>
                  <td><CompanyStatusBadge status={company.status} /></td>
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
                          onClick={() =>
                            void decide(company, "APPROVED")
                          }
                        >
                          Valider
                        </Button>
                      )}
                      {company.status === "PENDING" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            askReason(company, "REJECTED")
                          }
                        >
                          Rejeter
                        </Button>
                      )}
                      {company.status === "APPROVED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            askReason(company, "SUSPENDED")
                          }
                        >
                          Suspendre
                        </Button>
                      )}
                      {company.status === "SUSPENDED" && (
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            void decide(company, "APPROVED")
                          }
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

      <section className="workspace-band">
        <SectionHeading
          title="Inscriptions en attente"
          subtitle={pluralize(pending.length, "entreprise", "entreprises")}
        />
        {pending.length === 0 ? (
          <EmptyState title="Aucune inscription en attente" compact />
        ) : (
          <ul>
            {pending.map((company) => (
              <li className="member-row" key={company.id}>
                <div>
                  <strong>{company.name}</strong>
                  <p className="text-muted-foreground">
                    {company.businessSector} · {company.city} ·{" "}
                    {formatDate(company.createdAt)}
                  </p>
                </div>
                <div className="table-actions">
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => void decide(company, "APPROVED")}
                  >
                    Valider
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => askReason(company, "REJECTED")}
                  >
                    Rejeter
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

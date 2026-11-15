import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, StatusBadge } from "@/components/common";
import {
  listCompanyMembers,
  setUserActive,
  useCompanies,
  useUsers,
} from "@/data/repository";
import { formatDate, pluralize } from "@/lib/format";
import { errorMessage } from "@/lib/api";

export function AdminUsersPage() {
  const users = useUsers();
  const companies = useCompanies();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [state, setState] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const query = search.trim().toLocaleLowerCase("fr");
  const results = users.filter((user) => {
    const text =
      `${user.firstName} ${user.lastName} ${user.email}`.toLocaleLowerCase("fr");

    return (
      text.includes(query) &&
      (!role || user.role === role) &&
      (!state || (state === "active" ? user.isActive : !user.isActive))
    );
  });

  return (
    <main className="container page-main">
      <header className="page-head">
        <h1 className="page-title">Utilisateurs</h1>
      </header>

      <div className="filters">
        <Field label="Rechercher par nom ou email">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nom ou adresse email"
          />
        </Field>
        <Field label="Rôle">
          <select value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="">Tous</option>
            <option value="CLIENT">Client</option>
            <option value="COMPANY">Entreprise</option>
            <option value="ADMIN">Administrateur</option>
          </select>
        </Field>
        <Field label="État">
          <select value={state} onChange={(event) => setState(event.target.value)}>
            <option value="">Tous</option>
            <option value="active">Actifs</option>
            <option value="suspended">Suspendus</option>
          </select>
        </Field>
      </div>

      <p className="form-help" id="admin-account-protection">
        Les comptes administrateurs sont protégés contre la suspension afin de
        préserver notamment l’accès du compte connecté.
      </p>
      <p role="status">{pluralize(results.length, "résultat", "résultats")}</p>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Nom</th>
              <th scope="col">Email</th>
              <th scope="col">Rôle</th>
              <th scope="col">Entreprise rattachée</th>
              <th scope="col">État</th>
              <th scope="col">Inscription</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {results.map((user) => {
              const linkedCompanies = companies.filter(
                (company) =>
                  company.ownerId === user.id ||
                  listCompanyMembers(company.id).some(
                    (member) => member.userId === user.id,
                  ),
              );
              const protectedAccount = user.role === "ADMIN" && user.isActive;

              return (
                <tr key={user.id}>
                  <td>{user.firstName} {user.lastName}</td>
                  <td>{user.email}</td>
                  <td>
                    {user.role === "ADMIN"
                      ? "Administrateur"
                      : user.role === "COMPANY"
                        ? "Entreprise"
                        : "Client"}
                  </td>
                  <td>
                    {linkedCompanies.map((company) => company.name).join(", ") ||
                      "—"}
                  </td>
                  <td>
                    <StatusBadge tone={user.isActive ? "ok" : "out"}>
                      {user.isActive ? "Actif" : "Suspendu"}
                    </StatusBadge>
                  </td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={protectedAccount || busyId === user.id}
                      aria-describedby={
                        protectedAccount ? "admin-account-protection" : undefined
                      }
                      onClick={async () => {
                        if (user.isActive && user.role === "ADMIN") return;
                        setBusyId(user.id);
                        setError("");
                        try {
                          await setUserActive(user.id, !user.isActive);
                        } catch (cause) {
                          setError(errorMessage(cause));
                        } finally {
                          setBusyId(null);
                        }
                      }}
                    >
                      {busyId === user.id
                        ? "Enregistrement…"
                        : user.isActive
                          ? "Suspendre"
                          : "Réactiver"}
                    </Button>
                  </td>
                </tr>
              );
            })}
            {results.length === 0 && (
              <tr>
                <td className="empty-table" colSpan={7}>
                  Aucun utilisateur ne correspond aux filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

// Écran administrateur — Utilisateurs : comptes, rôles et activation.
// La suspension passe par une confirmation explicite ; les comptes que le
// serveur refuse de suspendre sont marqués « Protégé » avec leur motif.
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import type { User } from "@/types";
import { Button } from "@/components/ui/button";
import { Field, StatusBadge } from "@/components/common";
import { AdminToolbar, ConfirmAction, useAdminPagination } from "@/components/common/AdminUI";
import {
  listCompanyMembers,
  setUserActive,
  useCompanies,
  useCurrentUser,
  useUsers,
} from "@/data/repository";
import { formatDate, pluralize } from "@/lib/format";
import { errorMessage } from "@/lib/api";

export function AdminUsersPage() {
  const users = useUsers();
  const companies = useCompanies();
  const currentUser = useCurrentUser();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [state, setState] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [suspending, setSuspending] = useState<User | null>(null);

  // Reprise des deux règles appliquées par le serveur : aucun administrateur
  // n'est suspendable, et personne ne peut suspendre son propre compte.
  function protectionReason(user: User): string {
    if (user.role === "ADMIN")
      return "Compte d’administration : la plateforme protège l’accès des administrateurs.";
    if (user.id === currentUser?.id) return "C’est le compte avec lequel vous êtes connecté.";
    return "";
  }

  async function updateUser(user: User) {
    setBusyId(user.id);
    try {
      await setUserActive(user.id, !user.isActive);
      toast.success(user.isActive ? "Le compte est suspendu." : "Le compte est réactivé.");
      setSuspending(null);
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setBusyId(null);
    }
  }

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

  const pagination = useAdminPagination(results, `${search}|${role}|${state}`);

  return (
    <main className="workspace-page">
      <ConfirmAction
        open={Boolean(suspending)}
        title="Suspendre ce compte ?"
        description={`${suspending?.firstName ?? ""} ${suspending?.lastName ?? ""} (${suspending?.email ?? ""}) ne pourra plus se connecter à la plateforme. Ses données et son historique sont conservés.`}
        busy={busyId !== null}
        label="Suspendre le compte"
        onClose={() => setSuspending(null)}
        onConfirm={() => {
          if (suspending) void updateUser(suspending);
        }}
      />

      <AdminToolbar
        search={search}
        onSearch={setSearch}
        searchLabel="Rechercher par nom ou email"
        placeholder="Nom ou adresse email"
        total={results.length}
        onReset={() => {
          setSearch("");
          setRole("");
          setState("");
        }}
        filters={
          <>
            <Field label="Rôle">
              <select value={role} onChange={(event) => setRole(event.target.value)}>
                <option value="">Tous</option>
                <option value="CLIENT">Client</option>
                <option value="COMPANY">Entreprise</option>
                <option value="ADMIN">Administrateur</option>
              </select>
            </Field>
            <Field label="État">
              <select
                value={state}
                onChange={(event) => setState(event.target.value)}
              >
                <option value="">Tous</option>
                <option value="active">Actifs</option>
                <option value="suspended">Suspendus</option>
              </select>
            </Field>
          </>
        }
      />

      <p className="form-help" id="admin-account-protection">
        Les comptes d’administration et votre propre compte sont marqués
        « Protégé » : ils ne peuvent pas être suspendus.
      </p>

      <div className="admin-table-scroll" tabIndex={0} aria-label="Liste défilante">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Nom</th>
              <th scope="col">Rôle</th>
              <th scope="col">Entreprise rattachée</th>
              <th scope="col">État</th>
              <th scope="col">Inscription</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagination.rows.map((user) => {
              const linkedCompanies = companies.filter(
                (company) =>
                  company.ownerId === user.id ||
                  listCompanyMembers(company.id).some(
                    (member) => member.userId === user.id,
                  ),
              );
              const reason = protectionReason(user);

              return (
                <tr key={user.id}>
                  <td>
                    <strong>
                      {user.firstName} {user.lastName}
                    </strong>
                    <p className="text-muted-foreground">{user.email}</p>
                  </td>
                  <td>
                    <StatusBadge tone="neutral">
                      {user.role === "ADMIN"
                        ? "Administrateur"
                        : user.role === "COMPANY"
                          ? "Entreprise"
                          : "Client"}
                    </StatusBadge>
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
                    <div className="table-actions">
                      {reason ? (
                        <span
                          className="protected-account"
                          title={reason}
                          aria-describedby="admin-account-protection"
                        >
                          <ShieldCheck />
                          Protégé
                        </span>
                      ) : user.isActive ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId !== null}
                          onClick={() => setSuspending(user)}
                        >
                          {busyId === user.id ? "Enregistrement…" : "Suspendre"}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId !== null}
                          onClick={() => void updateUser(user)}
                        >
                          {busyId === user.id ? "Enregistrement…" : "Réactiver"}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {results.length === 0 && (
              <tr>
                <td className="empty-table" colSpan={6}>
                  Aucun utilisateur ne correspond aux filtres.
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

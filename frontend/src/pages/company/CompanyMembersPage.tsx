import { useState } from "react";
import {
  addMember,
  listCompanyMembers,
  removeMember,
  useCompanyMembers,
  useCurrentCompany,
  useMyRole,
  useUsers,
} from "@/data/repository";
import { EmptyState, Field, SectionHeading } from "@/components/common";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api";
import { MEMBERSHIP_ROLE_LABEL } from "@/types";
import type { MembershipRole } from "@/types";

export function CompanyMembersPage() {
  const company = useCurrentCompany();
  const role = useMyRole();
  const users = useUsers();
  const allMembers = useCompanyMembers();
  const [email, setEmail] = useState("");
  const [membershipRole, setMembershipRole] = useState<MembershipRole>("EDITOR");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  if (role !== "OWNER") {
    return (
      <main className="container page-main">
        <h1 className="page-title">Membres de l’entreprise</h1>
        <p role="alert">Réservé au propriétaire de l’entreprise</p>
      </main>
    );
  }

  if (!company) {
    return (
      <main className="container page-main">
        <EmptyState title="Aucune entreprise rattachée" />
      </main>
    );
  }

  const members = listCompanyMembers(company.id);

  return (
    <main className="container page-main">
      <h1 className="page-title">Membres de l’entreprise</h1>
      <p className="page-subtitle">
        Gérez les collaborateurs autorisés à intervenir sur votre entreprise.
      </p>

      <section className="workspace-band">
        <SectionHeading title="Équipe" />
        <ul className="grid gap-3">
          {members.map((member) => {
            const memberUser = users.find((user) => user.id === member.userId);
            return (
              <li
                key={member.id}
                className="member-row flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <strong>
                    {memberUser
                      ? `${memberUser.firstName} ${memberUser.lastName}`
                      : "Utilisateur inconnu"}
                  </strong>
                  <p className="text-muted-foreground">{memberUser?.email ?? "Email indisponible"}</p>
                  <p>{MEMBERSHIP_ROLE_LABEL[member.membershipRole]}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={member.membershipRole === "OWNER"}
                  onClick={async () => {
                    if (member.membershipRole === "OWNER" || busy) return;
                    setBusy(true);
                    setError("");
                    setSuccess("");
                    try {
                      await removeMember(member.id);
                      setSuccess("Membre retiré de l’entreprise.");
                    } catch (cause) {
                      setError(errorMessage(cause));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Retirer
                </Button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="workspace-band">
        <SectionHeading title="Ajouter un membre" />
        <form
          className="form-grid"
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");
            setSuccess("");
            if (busy) return;

            const normalizedEmail = email.trim().toLowerCase();
            const candidate = users.find(
              (user) => user.email.trim().toLowerCase() === normalizedEmail,
            );

            if (!candidate) {
              setError("Aucun utilisateur ne correspond à cet email.");
              return;
            }

            if (
              members.some((member) => member.userId === candidate.id)
            ) {
              setError("Ce membre existe déjà dans votre entreprise.");
              return;
            }

            if (
              allMembers.some((member) => member.userId === candidate.id)
            ) {
              setError("Cet utilisateur est déjà membre d’une autre entreprise.");
              return;
            }

            setBusy(true);
            try {
              await addMember({
                userId: candidate.id,
                companyId: company.id,
                membershipRole,
              });
              setEmail("");
              setMembershipRole("EDITOR");
              setSuccess("Membre ajouté.");
            } catch (cause) {
              setError(errorMessage(cause));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Email d’un utilisateur existant">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
                setSuccess("");
              }}
            />
          </Field>

          <Field label="Rôle">
            <select
              value={membershipRole}
              onChange={(event) => {
                setMembershipRole(event.target.value === "MANAGER" ? "MANAGER" : "EDITOR");
                setError("");
                setSuccess("");
              }}
            >
              <option value="MANAGER">{MEMBERSHIP_ROLE_LABEL.MANAGER}</option>
              <option value="EDITOR">{MEMBERSHIP_ROLE_LABEL.EDITOR}</option>
            </select>
          </Field>

          {error && (
            <p className="form-error form-full" role="alert">{error}</p>
          )}
          {success && (
            <p className="form-full text-primary" role="status">{success}</p>
          )}

          <div className="form-actions form-full">
            <Button type="submit" disabled={busy || !email.trim()}>
              {busy ? "Ajout en cours…" : "Ajouter le membre"}
            </Button>
          </div>
        </form>
      </section>

      <p className="legal-note">
        Les rôles internes changent réellement les accès au profil, aux produits,
        aux statistiques et à la gestion des membres : c'est le backend qui les
        applique.
      </p>
    </main>
  );
}

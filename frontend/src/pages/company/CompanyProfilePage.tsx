import { useState } from "react";
import {
  useCurrentCompany,
  useMyRole,
  updateCompany,
} from "@/data/repository";
import { CompanyStatusBadge, EmptyState, Field } from "@/components/common";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api";
import type { Company } from "@/types";

type ProfileDraft = Pick<
  Company,
  | "name"
  | "businessSector"
  | "description"
  | "address"
  | "city"
  | "country"
  | "phone"
  | "email"
> & {
  website: string;
  hours: string;
};

function profileValues(company: Company): ProfileDraft {
  return {
    name: company.name,
    businessSector: company.businessSector,
    description: company.description,
    address: company.address,
    city: company.city,
    country: company.country,
    phone: company.phone,
    email: company.email,
    website: company.website ?? "",
    hours: company.hours ?? "",
  };
}

function ProfileEditor({ company }: { company: Company }) {
  const [draft, setDraft] = useState<ProfileDraft>(() => profileValues(company));
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function change(key: keyof ProfileDraft, value: string) {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setSaved(false);
  }

  const fields: {
    key: Exclude<keyof ProfileDraft, "description">;
    label: string;
    type?: "email" | "tel" | "url";
  }[] = [
    { key: "name", label: "Nom de l’entreprise" },
    { key: "businessSector", label: "Secteur d’activité" },
    { key: "address", label: "Adresse" },
    { key: "city", label: "Ville" },
    { key: "country", label: "Pays" },
    { key: "phone", label: "Téléphone", type: "tel" },
    { key: "email", label: "Email", type: "email" },
    { key: "website", label: "Site web", type: "url" },
    { key: "hours", label: "Horaires" },
  ];

  return (
    <form
      className="form-grid"
      onSubmit={async (event) => {
        event.preventDefault();
        if (saving) return;
        const patch = Object.fromEntries(
          Object.entries(draft).map(([key, value]) => [key, value.trim()]),
        ) as ProfileDraft;
        setSaving(true);
        setError("");
        try {
          await updateCompany(company.id, patch);
          setDraft(patch);
          setSaved(true);
        } catch (cause) {
          setError(errorMessage(cause));
        } finally {
          setSaving(false);
        }
      }}
    >
      {fields.map(({ key, label, type }) => (
        <Field key={key} label={label}>
          <input
            type={type ?? "text"}
            required={key === "name" || key === "email"}
            value={draft[key]}
            onChange={(event) => change(key, event.target.value)}
          />
        </Field>
      ))}

      <div className="form-full">
        <Field label="Description">
          <textarea
            rows={5}
            value={draft.description}
            onChange={(event) => change("description", event.target.value)}
          />
        </Field>
      </div>

      <div className="form-full info-list">
        <p>Slug : <strong>{company.slug}</strong></p>
        <p>Statut : <CompanyStatusBadge status={company.status} /></p>
        <p className="form-help">Le statut est décidé par l’administrateur.</p>
      </div>

      {saved && (
        <p role="status" className="form-full text-primary">
          Modifications enregistrées
        </p>
      )}

      {error && (
        <p className="form-error form-full" role="alert">
          {error}
        </p>
      )}

      <div className="form-actions form-full">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setDraft(profileValues(company));
            setSaved(false);
          }}
        >
          Réinitialiser
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer le profil"}
        </Button>
      </div>
    </form>
  );
}

export function CompanyProfilePage() {
  const company = useCurrentCompany();
  const role = useMyRole();

  return (
    <main className="container page-main">
      <h1 className="page-title">Profil de l’entreprise</h1>
      {role === "EDITOR" ? (
        <p role="alert">Vous n’avez pas accès à la gestion du profil</p>
      ) : !company ? (
        <EmptyState title="Aucune entreprise rattachée" />
      ) : !role ? (
        <p className="text-muted-foreground">Chargement des droits d’accès…</p>
      ) : (
        <section className="workspace-band">
          <ProfileEditor key={company.id} company={company} />
        </section>
      )}
    </main>
  );
}

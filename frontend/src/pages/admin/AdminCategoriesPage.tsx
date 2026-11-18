// Écran administrateur — Catégories : carte d'ajout, renommage en dialogue et
// suppression refusée tant que des produits y sont rattachés.
import { useState } from "react";
import { toast } from "sonner";
import type { Category } from "@/types";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  Field,
  SectionHeading,
} from "@/components/common";
import { ConfirmAction, RowActions } from "@/components/common/AdminUI";
import {
  removeCategory,
  upsertCategory,
  useCategories,
  useProducts,
} from "@/data/repository";
import { pluralize } from "@/lib/format";
import { errorMessage } from "@/lib/api";

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function nameKey(value: string): string {
  return normalizeName(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr");
}

function slugify(value: string): string {
  return nameKey(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function AdminCategoriesPage() {
  const categories = useCategories();
  const products = useProducts();
  const [name, setName] = useState("");
  const [addError, setAddError] = useState("");
  const [renaming, setRenaming] = useState<Category | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameError, setRenameError] = useState("");
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);

  function validateName(value: string, excludedId?: string): string {
    if (!normalizeName(value)) return "Le nom de la catégorie est obligatoire.";
    if (
      categories.some(
        (category) =>
          category.id !== excludedId &&
          nameKey(category.name) === nameKey(value),
      )
    ) {
      return "Ce nom de catégorie est déjà utilisé.";
    }
    return "";
  }

  async function addCategory() {
    const cleanName = normalizeName(name);
    const validationError = validateName(cleanName);
    const id = slugify(cleanName);

    if (validationError) {
      setAddError(validationError);
      return;
    }
    if (!id) {
      setAddError(
        "Le nom doit contenir au moins une lettre latine ou un chiffre.",
      );
      return;
    }
    if (categories.some((category) => category.id === id)) {
      setAddError(
        "Ce nom génère un identifiant déjà utilisé. Choisissez un nom plus précis.",
      );
      return;
    }
    if (busy) return;

    setBusy(true);
    try {
      // Identifiant vide : c'est le backend qui crée la catégorie et lui donne
      // son identifiant définitif.
      await upsertCategory({ id: "", name: cleanName });
      setName("");
      setAddError("");
      toast.success(`La catégorie « ${cleanName} » a été ajoutée.`);
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function confirmRename() {
    if (!renaming) return;
    const cleanName = normalizeName(renameDraft);
    const validationError = validateName(cleanName, renaming.id);
    if (validationError) {
      setRenameError(validationError);
      return;
    }
    if (busy) return;

    setBusy(true);
    try {
      // L’identifiant reste stable pour conserver les produits rattachés.
      await upsertCategory({ id: renaming.id, name: cleanName });
      toast.success(`La catégorie « ${cleanName} » a été enregistrée.`);
      setRenaming(null);
      setRenameError("");
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  const deletingCount = deleting
    ? products.filter((product) => product.categoryId === deleting.id).length
    : 0;

  async function confirmDelete() {
    if (!deleting || deletingCount > 0 || busy) return;
    setBusy(true);
    try {
      await removeCategory(deleting.id);
      toast.success(`La catégorie « ${deleting.name} » a été supprimée.`);
      setDeleting(null);
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="workspace-page">
      <section className="workspace-band">
        <SectionHeading
          title="Ajouter une catégorie"
          subtitle="Une catégorie organise le catalogue des matières premières."
        />
        <form
          className="category-add"
          onSubmit={(event) => {
            event.preventDefault();
            void addCategory();
          }}
          noValidate
        >
          <Field label="Nom de la catégorie">
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setAddError("");
              }}
              placeholder="Nom de la catégorie"
              aria-invalid={Boolean(addError)}
              aria-describedby={addError ? "category-add-error" : undefined}
              required
            />
          </Field>
          <div className="form-actions">
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? "Ajout…" : "Ajouter"}
            </Button>
          </div>
          {addError && (
            <p
              className="form-error form-full"
              id="category-add-error"
              role="alert"
            >
              {addError}
            </p>
          )}
        </form>
      </section>

      <ConfirmAction
        open={Boolean(renaming)}
        title="Renommer la catégorie"
        description="Le nouveau nom s’applique immédiatement au catalogue. Les produits rattachés sont conservés."
        busy={busy}
        label="Enregistrer"
        onClose={() => {
          setRenaming(null);
          setRenameError("");
        }}
        onConfirm={() => void confirmRename()}
      >
        <Field label="Nom de la catégorie">
          <input
            value={renameDraft}
            onChange={(event) => {
              setRenameDraft(event.target.value);
              setRenameError("");
            }}
            aria-invalid={Boolean(renameError)}
            aria-describedby={renameError ? "category-rename-error" : undefined}
            required
          />
        </Field>
        {renameError && (
          <p className="form-error form-full" id="category-rename-error" role="alert">
            {renameError}
          </p>
        )}
      </ConfirmAction>

      <ConfirmAction
        open={Boolean(deleting)}
        title="Supprimer la catégorie"
        description={`Supprimer « ${deleting?.name ?? ""} » ? Cette action est irréversible.`}
        busy={busy}
        label="Supprimer la catégorie"
        confirmDisabled={deletingCount > 0}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      >
        {deletingCount > 0 && (
          <p className="form-help">
            Suppression impossible : {pluralize(deletingCount, "produit", "produits")}{" "}
            {deletingCount > 1 ? "utilisent" : "utilise"} encore cette catégorie.
            Déplacez ou supprimez ces produits d’abord.
          </p>
        )}
      </ConfirmAction>

      <section className="workspace-band">
        <SectionHeading
          title="Catégories existantes"
          subtitle={pluralize(categories.length, "catégorie", "catégories")}
        />

        {categories.length === 0 ? (
          <EmptyState
            title="Aucune catégorie"
            description="Ajoutez une première catégorie pour organiser le catalogue."
            compact
          />
        ) : (
          <ul className="admin-category-list">
            {categories.map((category) => {
              const relatedProducts = products.filter(
                (product) => product.categoryId === category.id,
              );
              const companyCount = new Set(
                relatedProducts.map((product) => product.companyId),
              ).size;
              const productCount = relatedProducts.length;

              return (
                <li className="admin-category-row" key={category.id}>
                  <div>
                    <strong>{category.name}</strong>
                    <p className="text-muted-foreground">
                      {pluralize(productCount, "produit", "produits")} ·{" "}
                      {pluralize(
                        companyCount,
                        "entreprise concernée",
                        "entreprises concernées",
                      )}
                    </p>
                  </div>
                  <div className="table-actions">
                    <RowActions
                      name={category.name}
                      disabled={busy}
                      items={[
                        {
                          label: "Renommer",
                          action: () => {
                            setRenameDraft(category.name);
                            setRenameError("");
                            setRenaming(category);
                          },
                        },
                        {
                          label: "Supprimer",
                          destructive: true,
                          action: () => setDeleting(category),
                        },
                      ]}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

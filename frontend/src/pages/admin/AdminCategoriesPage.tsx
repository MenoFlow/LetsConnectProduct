import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  Field,
  SectionHeading,
} from "@/components/common";
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
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");

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
      setAddError("Le nom doit contenir au moins une lettre latine ou un chiffre.");
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
    setServerError("");
    try {
      // Identifiant vide : c'est le backend qui crée la catégorie et lui donne
      // son identifiant définitif.
      await upsertCategory({ id: "", name: cleanName });
      setName("");
      setAddError("");
      setNotice(`La catégorie « ${cleanName} » a été ajoutée.`);
    } catch (cause) {
      setServerError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function renameCategory(id: string, currentName: string) {
    const cleanName = normalizeName(drafts[id] ?? currentName);
    const validationError = validateName(cleanName, id);

    if (validationError) {
      setErrors((previous) => ({ ...previous, [id]: validationError }));
      return;
    }
    if (busy) return;

    setBusy(true);
    setServerError("");
    try {
      // L’identifiant reste stable pour conserver les produits rattachés.
      await upsertCategory({ id, name: cleanName });
      setDrafts((previous) => ({ ...previous, [id]: cleanName }));
      setErrors((previous) => ({ ...previous, [id]: "" }));
      setNotice(`La catégorie « ${cleanName} » a été enregistrée.`);
    } catch (cause) {
      setServerError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container page-main">
      <header className="page-head">
        <h1 className="page-title">Catégories</h1>
      </header>

      <section className="workspace-band">
        <SectionHeading title="Ajouter une catégorie" />
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            addCategory();
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

      <p role="status" aria-live="polite">{notice}</p>

      {serverError && (
        <p className="form-error" role="alert">
          {serverError}
        </p>
      )}

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
          <ul>
            {categories.map((category) => {
              const relatedProducts = products.filter(
                (product) => product.categoryId === category.id,
              );
              const companyCount = new Set(
                relatedProducts.map((product) => product.companyId),
              ).size;
              const productCount = relatedProducts.length;
              const errorId = `category-error-${category.id}`;
              const reasonId = `category-delete-reason-${category.id}`;

              return (
                <li className="border-b border-border py-4" key={category.id}>
                  <form
                    className="form-grid"
                    noValidate
                    onSubmit={(event) => {
                      event.preventDefault();
                      renameCategory(category.id, category.name);
                    }}
                  >
                    <Field label={`Nom de la catégorie : ${category.name}`}>
                      <input
                        value={drafts[category.id] ?? category.name}
                        onChange={(event) => {
                          const value = event.target.value;
                          setDrafts((previous) => ({
                            ...previous,
                            [category.id]: value,
                          }));
                          setErrors((previous) => ({
                            ...previous,
                            [category.id]: "",
                          }));
                        }}
                        aria-invalid={Boolean(errors[category.id])}
                        aria-describedby={
                          errors[category.id] ? errorId : undefined
                        }
                        required
                      />
                    </Field>

                    <div>
                      <p>{pluralize(productCount, "produit", "produits")}</p>
                      <p className="text-muted-foreground">
                        {pluralize(
                          companyCount,
                          "entreprise concernée",
                          "entreprises concernées",
                        )}
                      </p>
                    </div>

                    <div className="form-actions">
                      <Button type="submit" size="sm" variant="outline" disabled={busy}>
                        Enregistrer
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={productCount > 0 || busy}
                        aria-describedby={productCount > 0 ? reasonId : undefined}
                        onClick={async () => {
                          // Nouvelle vérification avant toute suppression.
                          if (
                            products.some(
                              (product) => product.categoryId === category.id,
                            )
                          ) {
                            return;
                          }
                          setBusy(true);
                          setServerError("");
                          try {
                            await removeCategory(category.id);
                            setNotice(
                              `La catégorie « ${category.name} » a été supprimée.`,
                            );
                          } catch (cause) {
                            setServerError(errorMessage(cause));
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Supprimer
                      </Button>
                    </div>

                    {errors[category.id] && (
                      <p
                        className="form-error form-full"
                        id={errorId}
                        role="alert"
                      >
                        {errors[category.id]}
                      </p>
                    )}
                    {productCount > 0 && (
                      <p className="form-help form-full" id={reasonId}>
                        {productCount === 1
                          ? "1 produit utilise cette catégorie"
                          : `${productCount} produits utilisent cette catégorie`}
                      </p>
                    )}
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

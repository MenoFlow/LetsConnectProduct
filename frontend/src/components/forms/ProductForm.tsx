// Formulaire de produit, utilisé pour la création et la modification.
// Il ne connaît que les valeurs du produit : c'est l'appelant qui enregistre.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/common";
import {
  AVAILABILITY_LABEL,
  PRODUCT_STATUS_LABEL,
  AVAILABILITY_VALUES,
  PRODUCT_STATUS_VALUES,
  type Category,
  type Product,
  type ProductAvailability,
  type ProductStatus,
} from "@/types";

export type ProductDraft = Pick<
  Product,
  | "name"
  | "description"
  | "categoryId"
  | "unit"
  | "unitPrice"
  | "availability"
  | "status"
  | "specs"
>;

const UNITS = ["Tonne", "Kilogramme", "Gramme", "Once", "Baril", "Litre", "m³", "MMBtu", "Sac", "Balle", "Tête"];

export function ProductForm({
  initial,
  categories,
  submitLabel = "Enregistrer le produit",
  pending = false,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<ProductDraft>;
  categories: Category[];
  submitLabel?: string;
  /** L'enregistrement est en cours : le bouton se désactive. */
  pending?: boolean;
  onSubmit: (draft: ProductDraft) => void | Promise<void>;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "Unité");
  const [unitPrice, setUnitPrice] = useState(String(initial?.unitPrice ?? ""));
  const [availability, setAvailability] = useState<ProductAvailability>(
    initial?.availability ?? "AVAILABLE",
  );
  const [status, setStatus] = useState<ProductStatus>(initial?.status ?? "DRAFT");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [specs, setSpecs] = useState(initial?.specs ?? "");
  const [error, setError] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const price = Number(unitPrice);
    if (!name.trim() || !categoryId || !Number.isFinite(price) || price < 0) {
      setError("Renseignez le nom, la catégorie et un prix unitaire valide.");
      return;
    }
    setError("");
    const draft: ProductDraft = {
      name: name.trim(),
      description: description.trim(),
      categoryId,
      unit,
      unitPrice: price,
      availability,
      status,
    };
    const technicalSpecs = specs.trim();
    if (technicalSpecs) draft.specs = technicalSpecs;
    onSubmit(draft);
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <Field label="Nom du produit">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom de la matière première"
        />
      </Field>
      <Field label="Catégorie">
        <select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Choisir une catégorie</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="form-grid">
        <Field label="Prix unitaire (Ar)">
          <input
            required
            type="number"
            min="0"
            step="100"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            placeholder="Prix"
          />
        </Field>
        <Field label="Unité de vente">
          <select value={unit} onChange={(e) => setUnit(e.target.value)}>
            {UNITS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="form-grid">
        <Field label="Disponibilité">
          <select
            value={availability}
            onChange={(e) => setAvailability(e.target.value as ProductAvailability)}
          >
            {AVAILABILITY_VALUES.map((a) => (
              <option key={a} value={a}>
                {AVAILABILITY_LABEL[a]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Statut de publication">
          <select value={status} onChange={(e) => setStatus(e.target.value as ProductStatus)}>
            {PRODUCT_STATUS_VALUES.map((s) => (
              <option key={s} value={s}>
                {PRODUCT_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Description">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description du produit"
        />
      </Field>
      <Field label="Caractéristiques techniques">
        <textarea
          value={specs}
          onChange={(e) => setSpecs(e.target.value)}
          placeholder="Poids, dimensions, qualité…"
        />
      </Field>
      <p className="form-help">
        Seuls les produits publiés d’une entreprise approuvée apparaissent dans le catalogue public.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        )}
        <Button variant="amber" type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

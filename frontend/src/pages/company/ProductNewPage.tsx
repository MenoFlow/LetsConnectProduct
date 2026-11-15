// Création d'un produit. L'identifiant, le slug et la date de création sont
// attribués par le backend : cet écran n'invente aucune valeur.
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { EmptyState } from "@/components/common";
import { ProductForm, type ProductDraft } from "@/components/forms/ProductForm";
import { useCategories, useCurrentCompany, upsertProduct } from "@/data/repository";
import { errorMessage } from "@/lib/api";

export function ProductNewPage() {
  const company = useCurrentCompany();
  const categories = useCategories();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function createProduct(draft: ProductDraft) {
    if (!company || saving) return;

    setSaving(true);
    setError("");
    try {
      // id vide : le dépôt envoie une création et le serveur renvoie le
      // produit complet avec son identifiant.
      await upsertProduct({
        ...draft,
        id: "",
        companyId: company.id,
        createdAt: new Date().toISOString(),
        images: [],
      });
      void navigate({ to: "/company/produits" });
    } catch (cause) {
      setError(errorMessage(cause));
      setSaving(false);
    }
  }

  return (
    <main className="container page-main">
      <h1 className="page-title">Nouveau produit</h1>
      {!company ? (
        <EmptyState title="Aucune entreprise rattachée" />
      ) : (
        <section className="workspace-band">
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <ProductForm
            categories={categories}
            submitLabel="Créer le produit"
            pending={saving}
            onSubmit={createProduct}
            onCancel={() => {
              void navigate({ to: "/company/produits" });
            }}
          />
        </section>
      )}
    </main>
  );
}

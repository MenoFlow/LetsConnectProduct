import { useState } from "react";
import { Link, notFound, useNavigate, useParams } from "@tanstack/react-router";
import { EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";
import { ProductForm } from "@/components/forms/ProductForm";
import {
  getProduct,
  removeProduct,
  upsertProduct,
  useCategories,
  useCurrentCompany,
  useProducts,
} from "@/data/repository";
import { errorMessage } from "@/lib/api";

export function ProductEditPage() {
  const { id } = useParams({ from: "/company/produits/$id/modifier" });
  const company = useCurrentCompany();
  const categories = useCategories();
  const products = useProducts();
  const navigate = useNavigate();
  const [savedId, setSavedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Maintient getProduct réactif, y compris après une suppression externe.
  void products;
  const product = getProduct(id);

  if (deletingId === id) {
    return (
      <main className="container page-main">
        <p role="status">Produit supprimé. Retour au catalogue…</p>
        <Link to="/company/produits" className="text-link">Retour aux produits</Link>
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

  if (!product || product.companyId !== company.id) {
    throw notFound();
  }

  return (
    <main className="container page-main">
      <header className="page-head">
        <h1 className="page-title">Modifier le produit</h1>
        <Link className="text-link" to="/company/produits">Retour aux produits</Link>
      </header>

      {savedId === id && (
        <p role="status" className="my-4 text-primary">
          Modifications enregistrées.{" "}
          <Link className="text-link" to="/company/produits">Retour au catalogue</Link>
        </p>
      )}

      {error && (
        <p className="form-error my-4" role="alert">
          {error}
        </p>
      )}

      <section className="workspace-band">
        <ProductForm
          key={product.id}
          initial={product}
          categories={categories}
          pending={saving}
          onSubmit={async (draft) => {
            if (saving) return;
            setSaving(true);
            setError("");
            try {
              await upsertProduct({ ...product, ...draft });
              setSavedId(id);
            } catch (cause) {
              setError(errorMessage(cause));
            } finally {
              setSaving(false);
            }
          }}
          onCancel={() => {
            void navigate({ to: "/company/produits" });
          }}
        />
      </section>

      <section className="workspace-band">
        {deleteId === id ? (
          <div role="alert">
            <p>Supprimer définitivement « {product.name} » ?</p>
            <div className="form-actions">
              <Button variant="outline" onClick={() => setDeleteId(null)}>
                Annuler
              </Button>
              <Button
                disabled={deletingId !== null}
                onClick={async () => {
                  setError("");
                  try {
                    await removeProduct(id);
                    setDeletingId(id);
                    void navigate({ to: "/company/produits" });
                  } catch (cause) {
                    setError(errorMessage(cause));
                  }
                }}
              >
                Confirmer la suppression
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setDeleteId(id)}>
            Supprimer le produit
          </Button>
        )}
      </section>
    </main>
  );
}

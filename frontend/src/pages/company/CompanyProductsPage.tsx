import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  useCurrentCompany,
  useProducts,
  useCategories,
  upsertProduct,
  removeProduct,
} from "@/data/repository";
import {
  AvailabilityBadge,
  EmptyState,
  Field,
  ProductStatusBadge,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { PRODUCT_STATUS_LABEL } from "@/types";
import type { ProductStatus } from "@/types";

const statuses: ProductStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];

export function CompanyProductsPage() {
  const company = useCurrentCompany();
  const products = useProducts();
  const categories = useCategories();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (!company) {
    return (
      <main className="container page-main">
        <EmptyState title="Aucune entreprise rattachée" />
      </main>
    );
  }

  // Une écriture n'affiche pas d'écran de chargement : elle signale son échec.
  const run = (action: () => Promise<unknown>) => {
    void action().catch((cause) => setError(errorMessage(cause)));
  };

  const owned = products.filter((product) => product.companyId === company.id);
  const filtered = owned.filter(
    (product) =>
      product.name.toLocaleLowerCase("fr").includes(search.trim().toLocaleLowerCase("fr")) &&
      (!category || product.categoryId === category) &&
      (!status || product.status === status),
  );
  const productToDelete = owned.find((product) => product.id === pendingDelete);

  return (
    <main className="container page-main">
      <header className="page-head">
        <h1 className="page-title">Mes produits</h1>
        <Button asChild>
          <Link to="/company/produits/nouveau">Nouveau produit</Link>
        </Button>
      </header>

      <div className="filters">
        <Field label="Rechercher un produit">
          <input
            type="search"
            value={search}
            placeholder="Nom du produit"
            onChange={(event) => setSearch(event.target.value)}
          />
        </Field>
        <Field label="Catégorie">
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">Toutes les catégories</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Statut">
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Tous les statuts</option>
            {statuses.map((value) => (
              <option key={value} value={value}>{PRODUCT_STATUS_LABEL[value]}</option>
            ))}
          </select>
        </Field>
      </div>

      {productToDelete && (
        <section
          className="my-4 rounded-md border border-border bg-muted p-4"
          role="alert"
          aria-label="Confirmation de suppression"
        >
          <p>Supprimer définitivement « {productToDelete.name} » ?</p>
          <div className="form-actions">
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                run(() => removeProduct(productToDelete.id));
                setPendingDelete(null);
              }}
            >
              Confirmer la suppression
            </Button>
          </div>
        </section>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {owned.length === 0 ? (
        <EmptyState
          title="Aucun produit"
          description="Ajoutez votre première matière première au catalogue."
        >
          <Button asChild>
            <Link to="/company/produits/nouveau">Ajouter un produit</Link>
          </Button>
        </EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState title="Aucun produit ne correspond aux filtres">
          <Button
            variant="outline"
            onClick={() => {
              setSearch("");
              setCategory("");
              setStatus("");
            }}
          >
            Réinitialiser les filtres
          </Button>
        </EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <caption className="sr-only">Catalogue de l’entreprise, tous statuts</caption>
            <thead>
              <tr>
                <th scope="col">Produit</th>
                <th scope="col">Catégorie</th>
                <th scope="col">Prix</th>
                <th scope="col">Disponibilité</th>
                <th scope="col">Statut</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <tr key={product.id}>
                  <td>
                    <strong>{product.name}</strong>
                    <p className="text-sm text-muted-foreground">
                      {product.status === "PUBLISHED" && company.status === "APPROVED"
                        ? "Visible publiquement"
                        : "Non visible publiquement"}
                    </p>
                  </td>
                  <td>
                    {categories.find((item) => item.id === product.categoryId)?.name ??
                      "Catégorie inconnue"}
                  </td>
                  <td className="whitespace-nowrap">{formatPrice(product.unitPrice)} / {product.unit}</td>
                  <td><AvailabilityBadge availability={product.availability} /></td>
                  <td><ProductStatusBadge status={product.status} /></td>
                  <td className="whitespace-nowrap">
                    <div className="table-actions flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link
                          to="/company/produits/$id/modifier"
                          params={{ id: product.id }}
                        >
                          Modifier
                        </Link>
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          run(() =>
                            upsertProduct({
                              ...product,
                              status: product.status === "PUBLISHED" ? "ARCHIVED" : "PUBLISHED",
                            }),
                          )
                        }
                      >
                        {product.status === "PUBLISHED" ? "Archiver" : "Publier"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setPendingDelete(product.id)}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

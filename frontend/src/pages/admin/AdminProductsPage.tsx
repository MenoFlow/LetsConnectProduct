import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AvailabilityBadge,
  Field,
  ProductStatusBadge,
} from "@/components/common";
import {
  removeProduct,
  upsertProduct,
  useCategories,
  useCompanies,
  useProducts,
} from "@/data/repository";
import { formatPrice, pluralize } from "@/lib/format";
import { errorMessage } from "@/lib/api";

export function AdminProductsPage() {
  const products = useProducts();
  const companies = useCompanies();
  const categories = useCategories();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [status, setStatus] = useState("");
  const [availability, setAvailability] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Une écriture n'affiche pas d'écran de chargement : elle signale son échec.
  const run = (id: string, action: () => Promise<unknown>) => {
    setBusyId(id);
    setError("");
    void action()
      .catch((cause) => setError(errorMessage(cause)))
      .finally(() => setBusyId(null));
  };

  const query = search.trim().toLocaleLowerCase("fr");
  const results = products.filter(
    (product) =>
      (!categoryId || product.categoryId === categoryId) &&
      (!companyId || product.companyId === companyId) &&
      (!status || product.status === status) &&
      (!availability || product.availability === availability) &&
      `${product.name} ${product.description}`
        .toLocaleLowerCase("fr")
        .includes(query),
  );
  const productToDelete = products.find((product) => product.id === deleteId);

  return (
    <main className="container page-main">
      <header className="page-head">
        <h1 className="page-title">Produits</h1>
      </header>

      <div className="filters">
        <Field label="Rechercher un produit">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nom ou description"
          />
        </Field>
        <Field label="Catégorie">
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">Toutes</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Statut">
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Tous</option>
            <option value="DRAFT">Brouillon</option>
            <option value="PUBLISHED">Publié</option>
            <option value="ARCHIVED">Archivé</option>
          </select>
        </Field>
        <Field label="Disponibilité">
          <select
            value={availability}
            onChange={(event) => setAvailability(event.target.value)}
          >
            <option value="">Toutes</option>
            <option value="AVAILABLE">Disponible</option>
            <option value="ON_REQUEST">Sur demande</option>
            <option value="UNAVAILABLE">Indisponible</option>
          </select>
        </Field>
        <Field label="Entreprise">
          <select
            value={companyId}
            onChange={(event) => setCompanyId(event.target.value)}
          >
            <option value="">Toutes</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {productToDelete && (
        <section
          className="workspace-band"
          role="alertdialog"
          aria-labelledby="delete-product-title"
          aria-describedby="delete-product-description"
        >
          <h2 id="delete-product-title">Confirmer la suppression</h2>
          <p id="delete-product-description">
            Supprimer définitivement « {productToDelete.name} » ? Cette action
            est irréversible.
          </p>
          <div className="form-actions">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDeleteId(null)}
            >
              Annuler
            </Button>
            <Button
              size="sm"
              variant="amber"
              disabled={busyId !== null}
              onClick={() => {
                run(productToDelete.id, () => removeProduct(productToDelete.id));
                setDeleteId(null);
              }}
            >
              Confirmer la suppression
            </Button>
          </div>
        </section>
      )}

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
              <th scope="col">Produit</th>
              <th scope="col">Entreprise</th>
              <th scope="col">Catégorie</th>
              <th scope="col">Prix</th>
              <th scope="col">Disponibilité</th>
              <th scope="col">Statut</th>
              <th scope="col">Visible publiquement</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {results.map((product) => {
              const company = companies.find(
                (item) => item.id === product.companyId,
              );
              const category = categories.find(
                (item) => item.id === product.categoryId,
              );
              const isPublic =
                product.status === "PUBLISHED" &&
                company?.status === "APPROVED";

              return (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>{company?.name ?? "Entreprise introuvable"}</td>
                  <td>{category?.name ?? "Catégorie introuvable"}</td>
                  <td>{formatPrice(product.unitPrice)} / {product.unit}</td>
                  <td>
                    <AvailabilityBadge availability={product.availability} />
                  </td>
                  <td><ProductStatusBadge status={product.status} /></td>
                  <td>{isPublic ? "Oui" : "Non"}</td>
                  <td>
                    <div className="table-actions">
                      {product.status !== "PUBLISHED" && (
                        <Button
                          size="sm"
                          disabled={busyId === product.id}
                          onClick={() =>
                            run(product.id, () =>
                              upsertProduct({ ...product, status: "PUBLISHED" }),
                            )
                          }
                        >
                          Publier
                        </Button>
                      )}
                      {product.status === "PUBLISHED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === product.id}
                          onClick={() =>
                            run(product.id, () =>
                              upsertProduct({ ...product, status: "DRAFT" }),
                            )
                          }
                        >
                          Dépublier en brouillon
                        </Button>
                      )}
                      {product.status !== "ARCHIVED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === product.id}
                          onClick={() =>
                            run(product.id, () =>
                              upsertProduct({ ...product, status: "ARCHIVED" }),
                            )
                          }
                        >
                          Archiver
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteId(product.id)}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {results.length === 0 && (
              <tr>
                <td className="empty-table" colSpan={8}>
                  Aucun produit ne correspond aux filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

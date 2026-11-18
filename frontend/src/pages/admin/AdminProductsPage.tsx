// Écran administrateur — Produits : toutes les matières premières référencées.
// Filtres compacts en barre d'outils unique, publication/archivage par menu
// d'action et suppression confirmée en modale.
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AvailabilityBadge,
  Field,
  ProductStatusBadge,
} from "@/components/common";
import {
  AdminToolbar,
  ConfirmAction,
  RowActions,
  useAdminPagination,
} from "@/components/common/AdminUI";
import {
  removeProduct,
  upsertProduct,
  useCategories,
  useCompanies,
  useProducts,
} from "@/data/repository";
import { formatPrice } from "@/lib/format";
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
  const [busyId, setBusyId] = useState<string | null>(null);

  // Une écriture n'affiche pas d'écran de chargement : elle annonce son résultat.
  const run = (id: string, message: string, action: () => Promise<unknown>) => {
    setBusyId(id);
    void action()
      .then(() => {
        toast.success(message);
        setDeleteId(null);
      })
      .catch((cause) => toast.error(errorMessage(cause)))
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

  const pagination = useAdminPagination(
    results,
    `${search}|${categoryId}|${companyId}|${status}|${availability}`,
  );

  return (
    <main className="workspace-page">
      <ConfirmAction
        open={Boolean(productToDelete)}
        title="Supprimer ce produit ?"
        description={`Supprimer définitivement « ${productToDelete?.name ?? ""} » ? Cette action est irréversible.`}
        busy={busyId !== null}
        label="Supprimer le produit"
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (productToDelete)
            run(
              productToDelete.id,
              `« ${productToDelete.name} » a été supprimé.`,
              () => removeProduct(productToDelete.id),
            );
        }}
      />

      <AdminToolbar
        search={search}
        onSearch={setSearch}
        searchLabel="Rechercher un produit"
        placeholder="Nom ou description"
        total={results.length}
        onReset={() => {
          setSearch("");
          setCategoryId("");
          setCompanyId("");
          setStatus("");
          setAvailability("");
        }}
        filters={
          <>
            <Field label="Statut">
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="">Tous</option>
                <option value="DRAFT">Brouillon</option>
                <option value="PUBLISHED">Publié</option>
                <option value="ARCHIVED">Archivé</option>
              </select>
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
          </>
        }
      />

      <div className="admin-table-scroll" tabIndex={0} aria-label="Liste défilante">
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
            {pagination.rows.map((product) => {
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
                  <td>
                    {formatPrice(product.unitPrice)} / {product.unit}
                  </td>
                  <td>
                    <AvailabilityBadge availability={product.availability} />
                  </td>
                  <td>
                    <ProductStatusBadge status={product.status} />
                  </td>
                  <td>{isPublic ? "Oui" : "Non"}</td>
                  <td>
                    <div className="table-actions">
                      <RowActions
                        name={product.name}
                        disabled={busyId !== null}
                        items={[
                          {
                            label:
                              product.status === "PUBLISHED"
                                ? "Dépublier en brouillon"
                                : "Publier",
                            action: () =>
                              run(
                                product.id,
                                product.status === "PUBLISHED"
                                  ? `« ${product.name} » est revenu en brouillon.`
                                  : `« ${product.name} » est publié.`,
                                () =>
                                  upsertProduct({
                                    ...product,
                                    status:
                                      product.status === "PUBLISHED"
                                        ? "DRAFT"
                                        : "PUBLISHED",
                                  }),
                              ),
                          },
                          ...(product.status !== "ARCHIVED"
                            ? [
                                {
                                  label: "Archiver",
                                  action: () =>
                                    run(
                                      product.id,
                                      `« ${product.name} » est archivé.`,
                                      () =>
                                        upsertProduct({
                                          ...product,
                                          status: "ARCHIVED" as const,
                                        }),
                                    ),
                                },
                              ]
                            : []),
                          {
                            label: "Supprimer",
                            destructive: true,
                            action: () => setDeleteId(product.id),
                          },
                        ]}
                      />
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
      {pagination.control}
    </main>
  );
}

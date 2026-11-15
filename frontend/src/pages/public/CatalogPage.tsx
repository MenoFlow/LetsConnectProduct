// Catalogue public des produits : publiés, entreprise approuvée.
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  Check,
  Download,
  MapPin,
  MessageSquare,
  Package,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicPage } from "@/components/layout/PublicLayout";
import { EmptyState, Field, AvailabilityBadge } from "@/components/common";
import { pluralize } from "@/lib/format";
import { filterProducts, type ProductQuery } from "@/lib/catalog";
import {
  addToCart,
  useCart,
  useCategories,
  useCompanies,
  useCurrentUser,
  useProducts,
} from "@/data/repository";
import type { Product } from "@/types";
import { formatPrice } from "@/lib/format";
import { errorMessage } from "@/lib/api";

/** Ajoute au panier en attendant la réponse du serveur, et rapporte l'échec. */
function useAddToCart(product: Product | undefined) {
  const user = useCurrentUser();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const add = async () => {
    if (!user || !product || adding) return;
    setAdding(true);
    setError("");
    try {
      await addToCart(user.id, product);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setAdding(false);
    }
  };

  return { add, adding, error };
}

export function CatalogPage() {
  const [category, setCategory] = useState("Tous les produits");
  const [filters, setFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState<ProductQuery>({});
  const companies = useCompanies();
  const products = useProducts();
  const categories = useCategories();
  const tables = { companies, products, categories };
  const results = filterProducts(tables, {
    ...query,
    category: category === "Tous les produits" ? undefined : category,
    search,
  });

  return (
    <PublicPage>
      <main className="container page-main">
        <div className="breadcrumb">
          <Link to="/">Accueil</Link>
          <span>›</span>
          <span>Produits</span>
        </div>
        <div className="catalog-heading">
          <div className="catalog-brand">
            <span className="catalog-brand-icon">
              <Package size={27} />
            </span>
            <div>
              <h1>Matières premières</h1>
              <p>Métaux, minéraux, énergie, produits agricoles et animaux, au même endroit.</p>
            </div>
          </div>
          <div className="catalog-actions">
            <Button variant="outline" asChild>
              <Link to="/client/messages">
                <MessageSquare />
                Contacter un fournisseur
              </Link>
            </Button>
            <Button variant="amber" asChild>
              <Link to="/client/panier">
                <Plus />
                Mon panier
              </Link>
            </Button>
          </div>
        </div>
        <div className="category-tabs">
          <Button
            key="all"
            variant={category === "Tous les produits" ? "default" : "outline"}
            onClick={() => setCategory("Tous les produits")}
            aria-pressed={category === "Tous les produits"}
          >
            Tous les produits
          </Button>
          {categories.map((c) => (
            <Button
              key={c.id}
              variant={category === c.name ? "default" : "outline"}
              onClick={() => setCategory(c.name)}
              aria-pressed={category === c.name}
            >
              {c.name}
            </Button>
          ))}
        </div>
        <div className="catalog-controls">
          <div className="search-field">
            <Search />
            <input
              aria-label="Rechercher une matière première"
              placeholder="Rechercher une matière première, une référence…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={() => setFilters(!filters)} aria-expanded={filters}>
            <SlidersHorizontal />
            Filtres
          </Button>
          <Button variant="outline" asChild>
            <Link to="/entreprises">
              <Download />
              Annuaire des entreprises
            </Link>
          </Button>
        </div>
        {filters && (
          <div className="filters">
            <Field label="Localisation">
              <input
                placeholder="Ville ou région"
                value={query.city ?? ""}
                onChange={(e) => setQuery({ ...query, city: e.target.value })}
              />
            </Field>
            <Field label="Disponibilité">
              <select
                value={query.availability ?? "Toutes les disponibilités"}
                onChange={(e) => setQuery({ ...query, availability: e.target.value })}
              >
                <option>Toutes les disponibilités</option>
                <option>Disponible</option>
                <option>Sur demande</option>
                <option>Indisponible</option>
              </select>
            </Field>
            <Field label="Prix maximum (Ar)">
              <input
                type="number"
                min="0"
                placeholder="Sans limite"
                value={query.maxPrice ?? ""}
                onChange={(e) =>
                  setQuery({
                    ...query,
                    maxPrice: e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }
              />
            </Field>
          </div>
        )}
        <div className="catalog-summary">
          <div>
            <h2>Catalogue des produits</h2>
            <p>{category === "Tous les produits" ? "Toutes les matières premières" : category}</p>
          </div>
          <span className="text-muted-foreground">
            {pluralize(results.length, "produit", "produits")}
          </span>
        </div>
        {results.length === 0 ? (
          <EmptyState
            title={search ? "Aucun résultat" : "Aucun produit ne correspond aux filtres"}
            description={
              search
                ? `Aucun produit ne correspond à « ${search} ».`
                : "Modifiez la catégorie, la disponibilité, la localisation ou le prix maximum."
            }
          >
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setQuery({});
                setCategory("Tous les produits");
              }}
            >
              Réinitialiser la recherche
            </Button>
          </EmptyState>
        ) : (
          <div className="listing-grid">
            {results.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
    </PublicPage>
  );
}

function ProductCard({ product }: { product: Product }) {
  const company = useCompanies().find((c) => c.id === product.companyId);
  const user = useCurrentUser();
  const cart = useCart();
  const { add, adding, error: addError } = useAddToCart(product);
  const inCart = cart.items.some((line) => line.productId === product.id);

  return (
    <article className="product-card">
      <div className="product-card-head">
        <h3>
          <Link to="/produits/$id" params={{ id: product.id }}>
            {product.name}
          </Link>
        </h3>
        <AvailabilityBadge availability={product.availability} />
      </div>
      <p className="product-specs">{product.specs}</p>
      <p className="product-price">
        {formatPrice(product.unitPrice)}
        <small> / {product.unit}</small>
      </p>
      <div className="card-meta">
        <span>
          <Building2 size={14} />
          {company?.name}
        </span>
        <span>
          <MapPin size={14} />
          {company?.city}
        </span>
      </div>
      <div className="product-card-actions">
        {user?.role === "CLIENT" ? (
          <Button
            size="sm"
            variant={inCart ? "secondary" : "amber"}
            disabled={adding}
            onClick={() => void add()}
          >
            {inCart ? <Check /> : <Plus />}
            {adding ? "Ajout en cours…" : inCart ? "Ajouter encore" : "À mon panier"}
          </Button>
        ) : (
          <Button size="sm" variant="outline" asChild>
            <Link to="/connexion">
              <Plus />
              Se connecter pour ajouter
            </Link>
          </Button>
        )}
        {company && (
          <Button size="sm" variant="ghost" asChild>
            <Link to="/entreprises/$id" params={{ id: company.id }}>
              Voir le fournisseur
            </Link>
          </Button>
        )}
      </div>
      {addError && (
        <p className="form-error" role="alert">
          {addError}
        </p>
      )}
    </article>
  );
}

/** Fiche produit publique : prix, unité, disponibilité et fournisseur. */
export function ProductDetailPage({ id }: { id: string }) {
  const products = useProducts();
  const companies = useCompanies();
  const categories = useCategories();
  const user = useCurrentUser();
  const cart = useCart();
  const product = products.find((p) => p.id === id);
  const company = product ? companies.find((c) => c.id === product.companyId) : undefined;
  const { add, adding, error: addError } = useAddToCart(product);

  if (!product || product.status !== "PUBLISHED" || company?.status !== "APPROVED") {
    return (
      <PublicPage>
        <main className="container page-main">
          <EmptyState
            icon={Package}
            title="Produit indisponible"
            description="Ce produit n’est pas publié au catalogue public."
          >
            <Button variant="outline" asChild>
              <Link to="/produits">
                <ArrowRight />
                Retour au catalogue
              </Link>
            </Button>
          </EmptyState>
        </main>
      </PublicPage>
    );
  }

  const inCart = cart.items.some((line) => line.productId === product.id);
  const category = categories.find((c) => c.id === product.categoryId);

  return (
    <PublicPage>
      <main className="container page-main">
        <div className="breadcrumb">
          <Link to="/">Accueil</Link>
          <span>›</span>
          <Link to="/produits">Produits</Link>
          <span>›</span>
          <span>{product.name}</span>
        </div>
        <div className="company-detail-layout">
          <section className="workspace-band">
            <div className="section-heading">
              <h1 className="page-title">{product.name}</h1>
              <AvailabilityBadge availability={product.availability} />
            </div>
            <p className="page-subtitle">{product.description}</p>
            <div className="chip-row">
              {category && <span className="chip">{category.name}</span>}
              <span className="chip">Référence {product.id}</span>
            </div>
            <p className="product-price">
              {formatPrice(product.unitPrice)}
              <small> / {product.unit}</small>
            </p>
            {product.specs && (
              <>
                <h2>Caractéristiques</h2>
                <p>{product.specs}</p>
              </>
            )}
            <div className="form-actions">
              {user?.role === "CLIENT" ? (
                <Button variant="amber" disabled={adding} onClick={() => void add()}>
                  {inCart ? <Check /> : <Plus />}
                  {adding ? "Ajout en cours…" : inCart ? "Ajouter encore" : "À mon panier"}
                </Button>
              ) : (
                <Button variant="outline" asChild>
                  <Link to="/connexion">
                    <Plus />
                    Se connecter pour ajouter au panier
                  </Link>
                </Button>
              )}
              <Button variant="outline" asChild>
                <Link to="/client/panier">
                  <ArrowRight />
                  Voir mon panier
                </Link>
              </Button>
            </div>
            {addError && (
              <p className="form-error" role="alert">
                {addError}
              </p>
            )}
          </section>
          <aside className="workspace-band">
            <h2>Fournisseur</h2>
            <p>
              <strong>{company.name}</strong>
            </p>
            <p className="page-subtitle">{company.description}</p>
            <dl className="info-list">
              <div>
                <dt>Ville</dt>
                <dd>{company.city}</dd>
              </div>
              <div>
                <dt>Secteur</dt>
                <dd>{company.businessSector}</dd>
              </div>
              <div>
                <dt>Téléphone</dt>
                <dd>{company.phone}</dd>
              </div>
            </dl>
            <Button variant="outline" asChild className="w-full mt-5">
              <Link to="/entreprises/$id" params={{ id: company.id }}>
                <Building2 />
                Voir la fiche entreprise
              </Link>
            </Button>
          </aside>
        </div>
      </main>
    </PublicPage>
  );
}

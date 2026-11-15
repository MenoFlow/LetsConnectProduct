// Annuaire public des entreprises approuvées.
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  Check,
  Clock,
  Mail,
  MapPin,
  Package,
  Phone,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicPage } from "@/components/layout/PublicLayout";
import { EmptyState, Field, StatusBadge } from "@/components/common";
import { formatPrice, pluralize } from "@/lib/format";
import {
  companyCategoryNames,
  filterCompanies,
  type CompanyQuery,
} from "@/lib/catalog";
import {
  useCategories,
  useCompanies,
  useProducts,
  usePublicCompanies,
} from "@/data/repository";
import type { Company, Product } from "@/types";

function CompanyCard({
  company,
  products,
  categories,
}: {
  company: Company;
  products: Product[];
  categories: { id: string; name: string }[];
}) {
  const tables = { companies: [company], products, categories };
  const count = products.filter((p) => p.companyId === company.id && p.status === "PUBLISHED").length;
  return (
    <article className="company-card">
      <div className="company-card-head">
        <span className="company-card-icon">
          <Building2 size={22} />
        </span>
        <div>
          <h3>
            <Link to="/entreprises/$id" params={{ id: company.id }}>
              {company.name}
            </Link>
          </h3>
          <p className="company-sector">{company.businessSector}</p>
        </div>
      </div>
      <p className="company-summary">{company.description}</p>
      <div className="chip-row">
        {companyCategoryNames(tables, company.id).map((c) => (
          <span className="chip" key={c}>
            {c}
          </span>
        ))}
        {company.isVerified && (
          <StatusBadge tone="ok">
            <Check size={12} />
            Vérifiée
          </StatusBadge>
        )}
      </div>
      <div className="card-meta">
        <span>
          <MapPin size={14} />
          {company.city}
        </span>
        <span>
          <Package size={14} />
          {pluralize(count, "produit", "produits")}
        </span>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link to="/entreprises/$id" params={{ id: company.id }}>
          Voir la fiche
          <ArrowRight />
        </Link>
      </Button>
    </article>
  );
}

export function CompaniesPage() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(false);
  const [query, setQuery] = useState<CompanyQuery>({});
  const companies = useCompanies();
  const products = useProducts();
  const categories = useCategories();
  const tables = { companies, products, categories };
  const results = filterCompanies(tables, { ...query, search });
  const sectors = [
    "Tous les secteurs",
    ...Array.from(new Set(usePublicCompanies().map((c) => c.businessSector))),
  ];

  return (
    <PublicPage>
      <main className="container page-main">
        <div className="breadcrumb">
          <Link to="/">Accueil</Link>
          <span>›</span>
          <span>Entreprises</span>
        </div>
        <div className="catalog-heading">
          <div>
            <h1>Trouvez votre fournisseur</h1>
            <p>Des entreprises fiables qui vendent des matières premières.</p>
          </div>
          <Button variant="amber" asChild>
            <Link to="/inscription">
              <Plus />
              Inscrire mon entreprise
            </Link>
          </Button>
        </div>
        <div className="catalog-controls">
          <div className="search-field">
            <Search />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Rechercher une entreprise"
              placeholder="Nom d’entreprise, secteur ou matière première…"
            />
          </div>
          <Button variant="outline" onClick={() => setFilters(!filters)} aria-expanded={filters}>
            <SlidersHorizontal />
            Filtres
          </Button>
        </div>
        {filters && (
          <div className="filters">
            <Field label="Secteur d’activité">
              <select
                value={query.sector ?? "Tous les secteurs"}
                onChange={(e) => setQuery({ ...query, sector: e.target.value })}
              >
                {sectors.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Ville ou région">
              <input
                placeholder="Localisation"
                value={query.city ?? ""}
                onChange={(e) => setQuery({ ...query, city: e.target.value })}
              />
            </Field>
            <Field label="Catégorie de produits">
              <select
                value={query.category ?? "Toutes les catégories"}
                onChange={(e) => setQuery({ ...query, category: e.target.value })}
              >
                <option>Toutes les catégories</option>
                {categories.map((c) => (
                  <option key={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Trier par">
              <select
                value={query.sort ?? "Pertinence"}
                onChange={(e) => setQuery({ ...query, sort: e.target.value as CompanyQuery["sort"] })}
              >
                <option>Pertinence</option>
                <option>Nom de l’entreprise</option>
              </select>
            </Field>
          </div>
        )}
        <div className="catalog-summary">
          <h2>Annuaire des entreprises</h2>
          <span className="text-muted-foreground">
            {pluralize(results.length, "entreprise", "entreprises")}
          </span>
        </div>
        {results.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Aucune entreprise trouvée"
            description="Aucun profil ne correspond à votre recherche. Modifiez les filtres ou effacez-les."
          >
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setQuery({});
              }}
            >
              Réinitialiser la recherche
            </Button>
          </EmptyState>
        ) : (
          <div className="listing-grid">
            {results.map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
                products={products}
                categories={categories}
              />
            ))}
          </div>
        )}
      </main>
    </PublicPage>
  );
}

/** Fiche publique d'une entreprise : coordonnées et produits publiés. */
export function CompanyDetailPage({ id }: { id: string }) {
  const companies = useCompanies();
  const products = useProducts();
  const categories = useCategories();
  const company = companies.find((c) => c.id === id);
  if (!company || company.status !== "APPROVED") return <CompanyMissing />;

  const tables = { companies, products, categories };
  const items = products.filter((p) => p.companyId === company.id && p.status === "PUBLISHED");

  return (
    <PublicPage>
      <main className="container page-main">
        <div className="breadcrumb">
          <Link to="/">Accueil</Link>
          <span>›</span>
          <Link to="/entreprises">Entreprises</Link>
          <span>›</span>
          <span>{company.name}</span>
        </div>
        <div className="company-detail-head">
          <span className="catalog-brand-icon">
            <Building2 size={27} />
          </span>
          <div>
            <h1 className="page-title">{company.name}</h1>
            <p className="page-subtitle">{company.description}</p>
            <div className="chip-row">
              <span className="chip">{company.businessSector}</span>
              {companyCategoryNames(tables, company.id).map((c) => (
                <span className="chip" key={c}>
                  {c}
                </span>
              ))}
              {company.isVerified && <StatusBadge tone="ok">Entreprise vérifiée</StatusBadge>}
            </div>
          </div>
        </div>
        <div className="company-detail-layout">
          <section className="workspace-band">
            <div className="section-heading">
              <h2>
                <Package />
                Produits de l’entreprise
              </h2>
              <span className="text-muted-foreground">
                {pluralize(items.length, "produit", "produits")}
              </span>
            </div>
            {items.length === 0 ? (
              <EmptyState compact title="Aucun produit publié" />
            ) : (
              <div className="listing-grid compact">
                {items.map((product) => (
                  <article className="product-card" key={product.id}>
                    <div className="product-card-head">
                      <h3>
                        <Link to="/produits/$id" params={{ id: product.id }}>
                          {product.name}
                        </Link>
                      </h3>
                    </div>
                    <p className="product-specs">{product.specs}</p>
                    <p className="product-price">
                      {formatPrice(product.unitPrice)}
                      <small> / {product.unit}</small>
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
          <aside className="workspace-band">
            <h2>Coordonnées</h2>
            <dl className="info-list">
              <div>
                <dt>Adresse</dt>
                <dd>{company.address}</dd>
              </div>
              <div>
                <dt>Ville / Région</dt>
                <dd>
                  {company.city} — {company.region}
                </dd>
              </div>
              <div>
                <dt>Pays</dt>
                <dd>{company.country}</dd>
              </div>
              <div>
                <dt>Téléphone</dt>
                <dd>
                  <span className="contact-line">
                    <Phone size={14} />
                    {company.phone}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>
                  <span className="contact-line">
                    <Mail size={14} />
                    {company.email}
                  </span>
                </dd>
              </div>
              {company.hours && (
                <div>
                  <dt>Horaires</dt>
                  <dd>
                    <span className="contact-line">
                      <Clock size={14} />
                      {company.hours}
                    </span>
                  </dd>
                </div>
              )}
            </dl>
            <Button variant="outline" asChild className="w-full mt-5">
              <Link to="/connexion">
                <Mail />
                Contacter l’entreprise
              </Link>
            </Button>
          </aside>
        </div>
      </main>
    </PublicPage>
  );
}

function CompanyMissing() {
  return (
    <PublicPage>
      <main className="container page-main">
        <EmptyState
          icon={Building2}
          title="Fiche indisponible"
          description="Cette entreprise n’est pas publiée dans l’annuaire."
        >
          <Button variant="outline" asChild>
            <Link to="/entreprises">
              <ArrowRight />
              Retour à l’annuaire
            </Link>
          </Button>
        </EmptyState>
      </main>
    </PublicPage>
  );
}

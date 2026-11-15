// Page d'accueil publique.
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Search,
  Building2,
  Users,
  ShieldCheck,
  MessageSquare,
  ShoppingCart,
  Check,
  ChevronRight,
  Star,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicPage } from "@/components/layout/PublicLayout";
import { formatPrice } from "@/lib/format";
import { useCategories, useCompanies, useProducts, usePublicCompanies, usePublicProducts } from "@/data/repository";
import hero from "@/assets/raw-commodities.jpg";
import client from "@/assets/client.jpg";
import supplier from "@/assets/supplier.jpg";

export function HomePage() {
  const companies = usePublicCompanies();
  const products = usePublicProducts();

  return (
    <PublicPage>
      <main>
        <section className="hero">
          <img
            className="hero-image"
            src={hero}
            alt="Négociants examinant du café, du cacao et des métaux bruts"
            width={1536}
            height={1024}
          />
          <div className="container hero-inner">
            <div className="hero-content">
              <h1>
                Trouvez facilement les meilleurs fournisseurs de{" "}
                <span>matières premières</span>
              </h1>
              <p className="hero-description">
                Connectez-vous avec des entreprises fiables et découvrez leurs produits en toute
                simplicité.
              </p>
              <div className="hero-actions">
                <Button variant="amber" size="lg" asChild>
                  <Link to="/entreprises">
                    <Search />
                    Trouver un fournisseur
                    <ArrowRight />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/inscription">Inscrire mon entreprise</Link>
                </Button>
              </div>
              <div className="hero-trust">
                <span>
                  <Users />
                  Particuliers & professionnels
                </span>
                <span>
                  <Building2 />
                  Métaux, énergie, agricole
                </span>
                <span>
                  <ShieldCheck />
                  Échanges directs
                </span>
              </div>
            </div>
          </div>
        </section>
        <section className="steps-section">
          <div className="container steps-layout">
            <div className="steps-intro">
              <h2>Comment ça marche ?</h2>
              <p>
                Une plateforme simple et efficace
                <br />
                pour tous vos besoins.
              </p>
              <Link to="/a-propos" className="text-link">
                En savoir plus <ArrowRight size={14} />
              </Link>
            </div>
            <div className="steps-list">
              {[
                {
                  icon: Building2,
                  title: "1. Inscrivez-vous",
                  text: "Créez votre compte en quelques clics",
                },
                {
                  icon: Search,
                  title: "2. Recherchez",
                  text: "Trouvez les entreprises et produits",
                },
                {
                  icon: MessageSquare,
                  title: "3. Échangez",
                  text: "Discutez directement avec les entreprises",
                },
                {
                  icon: ShoppingCart,
                  title: "4. Préparez votre sélection",
                  text: "Ajoutez les produits dans votre panier",
                },
              ].map((step, i) => (
                <div className="step" key={step.title}>
                  <div className="step-icon">
                    <step.icon size={23} />
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                  {i < 3 && <ChevronRight className="step-arrow" size={20} />}
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="audience-section">
          <div className="container audience-grid">
            <article className="audience-item">
              <div className="audience-copy">
                <h2>
                  <Users size={22} />
                  Pour les clients
                </h2>
                <p>Trouvez, comparez et échangez avec les meilleurs fournisseurs.</p>
                <ul>
                  {[
                    "Recherche avancée d’entreprises",
                    "Consultation des produits et prix",
                    "Messagerie intégrée",
                    "Panier estimatif",
                  ].map((t) => (
                    <li key={t}>
                      <Check />
                      {t}
                    </li>
                  ))}
                </ul>
                <Button asChild>
                  <Link to="/entreprises">
                    Explorer les entreprises
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
              <img
                className="audience-image"
                src={client}
                alt="Cliente consultant son téléphone"
                loading="lazy"
                width={768}
                height={1024}
              />
            </article>
            <article className="audience-item">
              <div className="audience-copy">
                <h2>
                  <Building2 size={22} />
                  Pour les entreprises
                </h2>
                <p>Présentez votre activité et attirez plus de clients.</p>
                <ul>
                  {[
                    "Créez votre profil professionnel",
                    "Mettez en avant vos produits",
                    "Recevez des demandes de clients",
                    "Développez votre activité",
                  ].map((t) => (
                    <li key={t}>
                      <Check />
                      {t}
                    </li>
                  ))}
                </ul>
                <Button asChild>
                  <Link to="/connexion">
                    Mon espace entreprise
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
              <img
                className="audience-image"
                src={supplier}
                alt="Fournisseur dans son entrepôt de matières premières"
                loading="lazy"
                width={768}
                height={1024}
              />
            </article>
          </div>
        </section>
        <section className="showcase-section">
          <div className="container">
            <div className="showcase-grid">
              <div>
                <div className="section-heading">
                  <h2>
                    <Star />
                    Entreprises de l’annuaire
                  </h2>
                  <Link className="text-link" to="/entreprises">
                    Toutes les entreprises
                    <ArrowRight size={13} />
                  </Link>
                </div>
                <ul className="showcase-list">
                  {companies.slice(0, 3).map((company) => (
                    <li key={company.id}>
                      <Link to="/entreprises/$id" params={{ id: company.id }}>
                        <span className="showcase-icon">
                          <Building2 size={16} />
                        </span>
                        <span>
                          <strong>{company.name}</strong>
                          <small>
                            {company.businessSector} · {company.city}
                          </small>
                        </span>
                        <ChevronRight size={15} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="section-heading">
                  <h2>
                    <Package />
                    Produits du catalogue
                  </h2>
                  <Link className="text-link" to="/produits">
                    Tous les produits
                    <ArrowRight size={13} />
                  </Link>
                </div>
                <ul className="showcase-list">
                  {products.slice(0, 3).map((product) => (
                    <li key={product.id}>
                      <Link to="/produits/$id" params={{ id: product.id }}>
                        <span className="showcase-icon">
                          <Package size={16} />
                        </span>
                        <span>
                          <strong>{product.name}</strong>
                          <small>
                            {formatPrice(product.unitPrice)} / {product.unit}
                          </small>
                        </span>
                        <ChevronRight size={15} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
        <section className="join-section">
          <div className="container">
            <div className="join-banner">
              <p>
                Construisons ensemble vos prochains projets.
                <br />
                Rejoignez les entreprises et les clients du négoce de matières premières.
              </p>
              <Button variant="amber" asChild>
                <Link to="/inscription">
                  Créer mon compte
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </PublicPage>
  );
}

/** Tables partagées par les filtres du catalogue. */
export function useTables() {
  const companies = useCompanies();
  const products = useProducts();
  const categories = useCategories();
  return { companies, products, categories };
}

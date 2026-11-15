// Pages d'information : à propos, FAQ, contact, conditions, confidentialité.
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicPage } from "@/components/layout/PublicLayout";
import { Field } from "@/components/common";

const TITLES: Record<string, string> = {
  "a-propos": "À propos de MatérialConnect",
  faq: "Questions fréquentes",
  contact: "Contact",
  conditions: "Conditions d’utilisation",
  confidentialite: "Politique de confidentialité",
};

const FAQ = [
  {
    q: "À qui s’adresse MatérialConnect ?",
    a: "Aux particuliers, aux professionnels et aux entreprises qui vendent des matières premières : métaux, minéraux, énergie, produits agricoles et d’origine animale.",
  },
  {
    q: "Le panier constitue-t-il une commande ?",
    a: "Non. La liste des besoins est un récapitulatif estimatif. Elle ne constitue ni une commande ni une réservation de stock.",
  },
  {
    q: "Les prix sont-ils définitifs ?",
    a: "Les prix affichés sont indicatifs. Confirmez le prix et la disponibilité directement auprès du fournisseur.",
  },
  {
    q: "Comment contacter un fournisseur ?",
    a: "La messagerie permet des échanges directs entre les clients et les entreprises, depuis votre espace.",
  },
  {
    q: "Quelles sont les conditions pour apparaître dans l’annuaire ?",
    a: "Une entreprise doit être approuvée par un administrateur. Ses produits doivent ensuite être publiés.",
  },
];

export function InfoPage({ kind }: { kind: string }) {
  const [sent, setSent] = useState(false);
  const title = TITLES[kind] ?? "MatérialConnect";

  return (
    <PublicPage>
      <main className="container page-main">
        <div className="content-narrow prose-content">
          <div className="breadcrumb">
            <Link to="/">Accueil</Link>
            <span>›</span>
            <span>{title}</span>
          </div>
          <h1 className="page-title">{title}</h1>
          {kind === "a-propos" ? (
            <>
              <p>
                MatérialConnect rapproche les fournisseurs de matières premières (métaux, minéraux, énergie, produits agricoles
                et d’origine animale) des acheteurs particuliers et professionnels.
              </p>
              <h2>Pour les clients</h2>
              <p>
                Recherchez une entreprise, consultez son catalogue et préparez une liste estimative
                des matières premières dont vous avez besoin.
              </p>
              <h2>Pour les entreprises</h2>
              <p>
                Présentez votre activité, vos produits et vos coordonnées, puis échangez directement
                avec vos futurs clients.
              </p>
              <Button variant="amber" asChild className="mt-5">
                <Link to="/entreprises">
                  Explorer les entreprises
                  <ArrowRight />
                </Link>
              </Button>
            </>
          ) : kind === "faq" ? (
            <>
              {FAQ.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </>
          ) : kind === "contact" ? (
            <>
              <p>Votre demande à l’équipe MatérialConnect.</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSent(true);
                }}
                className="form-grid mt-6"
              >
                <Field label="Nom">
                  <input required placeholder="Votre nom" />
                </Field>
                <Field label="Email">
                  <input required type="email" placeholder="Votre adresse email" />
                </Field>
                <div className="form-full">
                  <Field label="Sujet">
                    <input required placeholder="Sujet de votre demande" />
                  </Field>
                </div>
                <div className="form-full">
                  <Field label="Message">
                    <textarea required placeholder="Votre message" />
                  </Field>
                </div>
                <div className="form-full">
                  {sent && (
                    <p className="form-help" role="status">
                      Votre message a bien été pris en compte.
                    </p>
                  )}
                  <Button variant="amber" type="submit">
                    Envoyer le message
                    <Send />
                  </Button>
                </div>
              </form>
            </>
          ) : kind === "conditions" ? (
            <>
              <p>Les conditions définitives seront publiées avant l’ouverture du service.</p>
              <h2>Liste de besoins et prix indicatifs</h2>
              <p>
                Le panier est estimatif. Il ne constitue ni une commande, ni une réservation de
                stock. Les prix et disponibilités doivent être confirmés auprès de chaque
                fournisseur.
              </p>
              <h2>Publication des entreprises</h2>
              <p>
                Une entreprise apparaît dans l’annuaire après validation par un administrateur. Les
                produits doivent être publiés par l’entreprise elle-même.
              </p>
            </>
          ) : (
            <>
              <p>
                La politique de confidentialité définitive sera publiée avant l’ouverture du
                service.
              </p>
              <h2>Données conservées</h2>
              <p>
                Vos informations de compte, votre panier, vos favoris et vos messages sont
                enregistrés sur nos serveurs et servent uniquement au fonctionnement du service.
              </p>
            </>
          )}
        </div>
      </main>
    </PublicPage>
  );
}

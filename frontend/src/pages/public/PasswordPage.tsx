// Récupération de mot de passe (simulée : aucun email n'est envoyé).
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PublicPage } from "@/components/layout/PublicLayout";
import { Field } from "@/components/common";

export function PasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <PublicPage>
      <main className="container page-main">
        <div className="auth-wrap">
          <h1 className="page-title">Mot de passe oublié</h1>
          <p className="page-subtitle">Renseignez l’adresse email associée à votre compte.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
          >
            <Field label="Adresse email">
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Votre adresse email"
              />
            </Field>
            {sent && (
              <p className="form-help" role="status">
                Si un compte correspond à cette adresse, un lien de réinitialisation vous sera envoyé.
              </p>
            )}
            <Button type="submit" className="auth-submit" variant="amber">
              Demander un lien
            </Button>
          </form>
          <p className="auth-bottom">
            <Link to="/connexion">Retour à la connexion</Link>
          </p>
        </div>
      </main>
    </PublicPage>
  );
}

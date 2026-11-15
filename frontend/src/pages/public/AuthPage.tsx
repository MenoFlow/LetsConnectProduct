// Connexion et inscription. Le backend tient la session : le cookie httpOnly
// `mc_session` est posé par /api/auth/login ou /api/auth/register, et cet écran
// n'enregistre aucune identité dans le navigateur.
import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Building2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicPage } from "@/components/layout/PublicLayout";
import { Field } from "@/components/common";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { homeRoute } from "@/lib/guards";

export function AuthPage({ signup = false }: { signup?: boolean }) {
  const navigate = useNavigate();
  const [role, setRole] = useState<"client" | "entreprise">("client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [city, setCity] = useState("");
  const [sector, setSector] = useState("Métaux industriels");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const authError = useAuthStore((s) => s.error);

  /** Ouvre une session puis amène l'utilisateur dans son espace. */
  async function signIn(targetEmail: string, targetPassword: string) {
    setError("");
    try {
      const user = await login(targetEmail, targetPassword);
      navigate({ to: homeRoute(user.role) });
    } catch {
      // Le message de l'API est déjà porté par authError et affiché sous le champ.
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (submitting) return;

    if (!signup) {
      setSubmitting(true);
      try {
        await signIn(email, password);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!email.trim() || password.length < 8) {
      setError("Indiquez une adresse email et un mot de passe d’au moins 8 caractères.");
      return;
    }
    if (role === "entreprise" && !companyName.trim()) {
      setError("Indiquez le nom de votre entreprise.");
      return;
    }
    if (!accepted) {
      setError("Acceptez les conditions d’utilisation pour continuer.");
      return;
    }

    setSubmitting(true);
    try {
      // Le backend crée le compte, la session, et pour une entreprise sa fiche
      // « En attente de validation » avec son fondateur comme propriétaire.
      const user = await register({
        email: email.trim().toLowerCase(),
        password,
        firstName: role === "client" ? firstName.trim() || "Nouveau" : "Responsable",
        lastName: role === "client" ? lastName.trim() || "Client" : "Entreprise",
        role: role === "client" ? "CLIENT" : "COMPANY",
        ...(role === "entreprise"
          ? {
              companyName: companyName.trim(),
              city: city.trim() || "Antananarivo",
              businessSector: sector,
            }
          : {}),
      });
      if (user.role === "COMPANY") {
        toast.success("Demande d’inscription envoyée", {
          description: "Votre entreprise est en attente de validation par un administrateur.",
        });
      } else {
        toast.success("Compte client créé");
      }
      navigate({ to: homeRoute(user.role) });
    } catch {
      // Le message de l'API est déjà porté par authError et affiché sous le champ.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PublicPage>
      <main className="container page-main">
        <div className="auth-wrap">
          <h1 className="page-title">
            {signup ? "Créer mon compte" : "Bienvenue sur MatérialConnect"}
          </h1>
          <p className="page-subtitle">
            {signup
              ? "Rejoignez la communauté des professionnels des matières premières."
              : "Retrouvez votre espace et vos échanges."}
          </p>
          {signup && (
            <div className="auth-role">
              <Button
                variant={role === "client" ? "default" : "outline"}
                aria-pressed={role === "client"}
                onClick={() => setRole("client")}
              >
                <Users />
                Je suis client
              </Button>
              <Button
                variant={role === "entreprise" ? "default" : "outline"}
                aria-pressed={role === "entreprise"}
                onClick={() => setRole("entreprise")}
              >
                <Building2 />
                Je suis entreprise
              </Button>
            </div>
          )}
          <form className="auth-form" onSubmit={submit}>
            {signup && role === "client" && (
              <div className="form-grid">
                <Field label="Prénom">
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Votre prénom" />
                </Field>
                <Field label="Nom">
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Votre nom" />
                </Field>
              </div>
            )}
            {signup && role === "entreprise" && (
              <>
                <Field label="Nom de l’entreprise">
                  <input
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Nom commercial"
                  />
                </Field>
                <div className="form-grid">
                  <Field label="Ville">
                    <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ville" />
                  </Field>
                  <Field label="Secteur">
                    <select value={sector} onChange={(e) => setSector(e.target.value)}>
                      <option>Métaux industriels</option>
                      <option>Métaux précieux</option>
                      <option>Minéraux</option>
                      <option>Énergie</option>
                      <option>Céréales</option>
                      <option>Cultures agricoles</option>
                      <option>Fibres & bois</option>
                      <option>Produits d’origine animale</option>
                    </select>
                  </Field>
                </div>
              </>
            )}
            <Field label="Adresse email">
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Votre adresse email"
              />
            </Field>
            <Field label="Mot de passe">
              <input
                required
                type="password"
                minLength={signup ? 8 : 1}
                autoComplete={signup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={signup ? "Au moins 8 caractères" : "Votre mot de passe"}
              />
            </Field>
            {signup ? (
              <label className="check-row">
                <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
                <span>
                  J’accepte les <Link to="/conditions">conditions d’utilisation</Link>.
                </span>
              </label>
            ) : (
              <div className="flex justify-end">
                <Link to="/mot-de-passe-oublie" className="text-link">
                  Mot de passe oublié ?
                </Link>
              </div>
            )}
            {signup && role === "entreprise" && (
              <p className="form-help">
                Votre entreprise sera créée avec le statut « En attente de validation » : un
                administrateur devra l’approuver avant sa publication.
              </p>
            )}
            {(error || authError) && (
              <p className="form-error" role="alert">
                {error || authError}
              </p>
            )}
            <Button className="auth-submit" variant="amber" type="submit" disabled={submitting}>
              {submitting
                ? signup
                  ? "Création du compte…"
                  : "Connexion en cours…"
                : signup
                  ? "Créer mon compte"
                  : "Se connecter"}
              {!submitting && <ArrowRight />}
            </Button>
          </form>
          <p className="auth-bottom">
            {signup ? "Déjà inscrit ? " : "Pas encore de compte ? "}
            {signup ? (
              <Link to="/connexion">Se connecter</Link>
            ) : (
              <Link to="/inscription">S’inscrire</Link>
            )}
          </p>
        </div>
      </main>
    </PublicPage>
  );
}

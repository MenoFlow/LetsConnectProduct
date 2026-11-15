// Paramètres du compte. Les informations du compte viennent du backend ; les
// deux interrupteurs ci-dessous sont des préférences d'affichage locales.
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicPage } from "@/components/layout/PublicLayout";
import { EmptyState, Field } from "@/components/common";
import { useCurrentUser } from "@/data/repository";
import { errorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useLogout } from "@/hooks/useLogout";
import { homeRoute } from "@/lib/guards";

export function SettingsPage() {
  const user = useCurrentUser();
  const logout = useLogout();
  const changePassword = useAuthStore((s) => s.changePassword);
  const [notifications, setNotifications] = useState(true);
  const [visibility, setVisibility] = useState(true);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordDone, setPasswordDone] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!user) {
    return (
      <PublicPage>
        <main className="container page-main">
          <EmptyState
            title="Aucun compte connecté"
            description="Connectez-vous pour accéder aux paramètres de votre compte."
          >
            <Button variant="amber" asChild>
              <Link to="/connexion">
                Se connecter
                <ArrowRight />
              </Link>
            </Button>
          </EmptyState>
        </main>
      </PublicPage>
    );
  }

  async function submitPassword(event: React.FormEvent) {
    event.preventDefault();
    setPasswordError("");
    setPasswordDone(false);
    if (busy) return;
    if (next.length < 12) {
      setPasswordError("Le nouveau mot de passe doit contenir au moins 12 caractères.");
      return;
    }
    setBusy(true);
    try {
      await changePassword(current, next);
      setPasswordDone(true);
      setCurrent("");
      setNext("");
    } catch (error) {
      setPasswordError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PublicPage>
      <main className="container page-main">
        <h1 className="page-title">Paramètres</h1>
        <p className="page-subtitle">Les préférences de votre espace MatérialConnect.</p>
        <section className="workspace-band">
          <h2>Informations du compte</h2>
          <dl className="info-list">
            <div>
              <dt>Nom</dt>
              <dd>
                {user.firstName} {user.lastName}
              </dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Rôle</dt>
              <dd>{user.role === "CLIENT" ? "Client" : user.role === "COMPANY" ? "Entreprise" : "Administrateur"}</dd>
            </div>
            <div>
              <dt>État</dt>
              <dd>{user.isActive ? "Actif" : "Suspendu"}</dd>
            </div>
          </dl>
          <Button variant="outline" asChild className="mt-5">
            <Link to={homeRoute(user.role)}>
              Ouvrir mon espace
              <ArrowRight />
            </Link>
          </Button>
        </section>
        <section className="workspace-band">
          <div className="settings-group">
            <div>
              <h2>Notifications par email</h2>
              <p>Recevoir les notifications de nouveaux messages.</p>
            </div>
            <input
              type="checkbox"
              aria-label="Notifications par email"
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
            />
          </div>
          <div className="settings-group">
            <div>
              <h2>Visibilité du profil</h2>
              <p>Afficher votre entreprise dans l’annuaire.</p>
            </div>
            <input
              type="checkbox"
              aria-label="Visibilité du profil"
              checked={visibility}
              onChange={(e) => setVisibility(e.target.checked)}
            />
          </div>
        </section>
        <section className="workspace-band">
          <h2>Mot de passe</h2>
          <p className="page-subtitle">
            Changer de mot de passe ferme toutes vos sessions ouvertes, sur cet appareil comme
            sur les autres.
          </p>
          <form className="form-grid" onSubmit={submitPassword}>
            <Field label="Mot de passe actuel">
              <input
                required
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </Field>
            <Field label="Nouveau mot de passe">
              <input
                required
                type="password"
                minLength={12}
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                placeholder="Au moins 12 caractères"
              />
            </Field>
            {passwordError && (
              <p className="form-error form-full" role="alert">
                {passwordError}
              </p>
            )}
            {passwordDone && (
              <p className="form-help form-full" role="status">
                Mot de passe changé.
              </p>
            )}
            <div className="form-actions form-full">
              <Button type="submit" disabled={busy || !current || !next}>
                {busy ? "Enregistrement…" : "Modifier le mot de passe"}
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  void logout();
                }}
              >
                Se déconnecter
              </Button>
            </div>
          </form>
        </section>
      </main>
    </PublicPage>
  );
}

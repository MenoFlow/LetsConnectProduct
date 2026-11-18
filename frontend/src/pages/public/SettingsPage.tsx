// Paramètres du compte. Les informations du compte viennent du backend ; les
// deux interrupteurs ci-dessous sont des préférences d'affichage locales.
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AdminLayout } from "@/layouts/AdminLayout";
import { ClientLayout } from "@/layouts/ClientLayout";
import { CompanyLayout } from "@/layouts/CompanyLayout";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/common";
import { ArrowRight, ShieldCheck, LogOut } from "lucide-react";
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

  // Les paramètres restent dans la coquille du rôle connecté : depuis un espace
  // protégé, aucun retour à la mise en page publique.
  const Layout =
    user.role === "ADMIN"
      ? AdminLayout
      : user.role === "COMPANY"
        ? CompanyLayout
        : ClientLayout;
  return (
    <Layout title="Paramètres du compte">
      <main className="workspace-page settings-page">
        {user.role !== "ADMIN" && (
          <h1 className="page-title">Paramètres du compte</h1>
        )}
        <p className="page-subtitle">Les préférences de votre espace MatérialConnect.</p>
        <section className="workspace-band">
          <div className="settings-profile"><span className="settings-avatar">{user.firstName.charAt(0)}{user.lastName.charAt(0)}</span><div><h2>Profil et accès</h2><p className="text-muted-foreground">{user.firstName} {user.lastName}</p></div><ShieldCheck className="text-muted-foreground" /></div>
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
              <dd><StatusBadge tone="neutral">{user.role === "CLIENT" ? "Client" : user.role === "COMPANY" ? "Entreprise" : "Administrateur"}</StatusBadge></dd>
            </div>
            <div>
              <dt>État</dt>
              <dd><StatusBadge tone={user.isActive ? "ok" : "out"}>{user.isActive ? "Actif" : "Suspendu"}</StatusBadge></dd>
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
          <h2>Préférences</h2>
          <div className="settings-group"><div><label htmlFor="email-notifications">Notifications par email</label><p>Les notifications par email ne sont pas activées pour ce compte.</p></div><Switch id="email-notifications" checked={false} disabled /></div>
          {user.role === "COMPANY" && <p className="form-help">La visibilité de l’entreprise dépend de sa validation par l’administration.</p>}
        </section>
        <section className="workspace-band">
          <h2>Sécurité</h2>
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
                Mot de passe changé. Toutes vos sessions sont fermées. <Link to="/connexion" onClick={() => useAuthStore.getState().clearSession()} className="underline">Se reconnecter</Link>
              </p>
            )}
            <div className="form-actions form-full">
              <Button type="submit" disabled={busy || !current || !next}>
                {busy ? "Enregistrement…" : "Modifier le mot de passe"}
              </Button>

            </div>
          </form>
        </section>
        <section className="workspace-band settings-session"><div><h2>Session</h2><p className="text-muted-foreground">Quitter votre compte sur cet appareil.</p></div><Button type="button" variant="outline" disabled={busy} onClick={() => void logout()}><LogOut />Se déconnecter</Button></section>
      </main>
    </Layout>
  );
}

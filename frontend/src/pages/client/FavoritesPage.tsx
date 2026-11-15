import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CompanyStatusBadge, EmptyState } from "@/components/common";
import {
  useCurrentUser,
  useFavorites,
  useCompanies,
  toggleFavorite,
} from "@/data/repository";
import { errorMessage } from "@/lib/api";

export function FavoritesPage() {
  const user = useCurrentUser();
  const favorites = useFavorites();
  const companies = useCompanies();
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!user) return null;

  const favoriteIds = new Set(
    favorites.filter((favorite) => favorite.userId === user.id)
      .map((favorite) => favorite.companyId),
  );
  const favoriteCompanies = companies.filter((company) =>
    favoriteIds.has(company.id),
  );

  return (
    <main className="container page-main">
      <header className="page-head">
        <div>
          <h1 className="page-title">Mes favoris</h1>
          <p className="page-subtitle">
            Retrouvez les entreprises sélectionnées pour vos projets.
          </p>
        </div>
      </header>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {favoriteCompanies.length === 0 ? (
        <EmptyState
          title="Aucune entreprise favorite"
          description="Explorez les fournisseurs et ajoutez vos favoris."
        >
          <Button asChild>
            <Link to="/entreprises">Explorer les entreprises</Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="listing-grid">
          {favoriteCompanies.map((company) => (
            <article className="rounded-lg border border-border bg-card p-5" key={company.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{company.name}</h2>
                <CompanyStatusBadge status={company.status} />
              </div>
              <p className="text-muted-foreground mt-3">
                {company.businessSector} · {company.city}
              </p>
              <p className="mt-3">
                {company.description.length > 180
                  ? `${company.description.slice(0, 180)}…`
                  : company.description}
              </p>
              <div className="flex flex-wrap gap-2 mt-5">
                <Button asChild size="sm">
                  <Link to="/entreprises/$id" params={{ id: company.id }}>
                    Voir la fiche
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busyId === company.id}
                  onClick={async () => {
                    setBusyId(company.id);
                    setError("");
                    try {
                      await toggleFavorite(user.id, company.id);
                    } catch (cause) {
                      setError(errorMessage(cause));
                    } finally {
                      setBusyId(null);
                    }
                  }}
                >
                  {busyId === company.id ? "Retrait…" : "Retirer des favoris"}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

// En-tête, pied de page et coquille des pages publiques.
import { useState, type ReactNode } from "react";
import { Link, useHydrated, type LinkProps } from "@tanstack/react-router";
import { Building2, Heart, LogOut, Menu, Search, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart, useCurrentUser } from "@/data/repository";
import { homeRoute } from "@/lib/guards";
import { useLogout } from "@/hooks/useLogout";

export function Logo() {
  return (
    <Link to="/" className="brand" aria-label="MatérialConnect, accueil">
      <span className="brand-mark">
        <Building2 size={30} />
        <span />
      </span>
      <span>
        Matérial<span className="text-highlight">Connect</span>
      </span>
    </Link>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const hydrated = useHydrated();
  const user = useCurrentUser();
  const logout = useLogout();
  const cart = useCart();
  const cartCount = hydrated ? cart.items.reduce((n, i) => n + i.quantity, 0) : 0;
  const space: LinkProps["to"] = homeRoute(user?.role);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Logo />
        <nav className="desktop-nav">
          <Link to="/" activeOptions={{ exact: true }}>
            Accueil
          </Link>
          <Link to="/entreprises">Entreprises</Link>
          <Link to="/produits">Produits</Link>
          <Link to="/a-propos">À propos</Link>
          <Link to="/faq">FAQ</Link>
        </nav>
        <div className="header-actions">
          <Button variant="ghost" size="icon" asChild title="Rechercher">
            <Link to="/entreprises">
              <Search />
            </Link>
          </Button>
          {hydrated && user?.role === "CLIENT" && (
            <Button variant="ghost" size="icon" asChild title="Mon panier">
              <Link to="/client/panier">
                <ShoppingCart />
                {cartCount > 0 && <span className="nav-badge">{cartCount}</span>}
              </Link>
            </Button>
          )}
          {hydrated && user?.role === "CLIENT" && (
            <Button variant="ghost" size="icon" asChild title="Mes favoris">
              <Link to="/client/favoris">
                <Heart />
              </Link>
            </Button>
          )}
          {user ? (
            <>
              <Button variant="outline" asChild className="login-link">
                <Link to={space}>Mon espace</Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Se déconnecter"
                aria-label="Se déconnecter"
                onClick={() => void logout()}
              >
                <LogOut />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" asChild className="login-link">
                <Link to="/connexion">Se connecter</Link>
              </Button>
              <Button variant="amber" asChild className="signup-link">
                <Link to="/inscription">S’inscrire</Link>
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="mobile-menu"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      {open && (
        <nav className="mobile-nav" onClick={() => setOpen(false)}>
          <Link to="/">Accueil</Link>
          <Link to="/entreprises">Entreprises</Link>
          <Link to="/produits">Produits</Link>
          <Link to="/a-propos">À propos</Link>
          <Link to="/faq">FAQ</Link>
          {user ? <Link to={space}>Mon espace</Link> : <Link to="/connexion">Se connecter</Link>}
          {!user && <Link to="/inscription">S’inscrire</Link>}
        </nav>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <Logo />
        <nav>
          <Link to="/a-propos">À propos</Link>
          <Link to="/faq">FAQ</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/conditions">Conditions d’utilisation</Link>
          <Link to="/confidentialite">Confidentialité</Link>
        </nav>
        <span className="footer-copy">© 2026 MatérialConnect</span>
      </div>
    </footer>
  );
}

export function PublicPage({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}

// Coquille des espaces protégés (client, entreprise, administrateur).
// Les trois espaces la partagent ; chacun fournit sa navigation.
import type { ReactNode } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { ArrowRight, Building2, LogOut, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "./PublicLayout";
import { useCurrentUser } from "@/data/repository";
import { useLogout } from "@/hooks/useLogout";

export type WorkspaceNavItem = {
  to: NonNullable<LinkProps["to"]>;
  label: string;
  icon: LucideIcon;
  badge?: number;
  exact?: boolean;
};

export function WorkspaceShell({
  title,
  eyebrow,
  organization,
  nav,
  children,
  right,
}: {
  title: string;
  eyebrow: string;
  organization?: { name: string; detail: string };
  nav: WorkspaceNavItem[];
  children: ReactNode;
  right?: ReactNode;
}) {
  const user = useCurrentUser();
  const logout = useLogout();

  return (
    <div className="workspace">
      <aside className="workspace-sidebar">
        <Logo />
        {organization && (
          <div className="organization">
            <span className="organization-icon">
              <Building2 />
            </span>
            <div>
              <strong>{organization.name}</strong>
              <small>{organization.detail}</small>
            </div>
          </div>
        )}
        <nav className="workspace-nav">
          {nav.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              {...(item.exact ? { activeOptions: { exact: true } } : {})}
            >
              <item.icon />
              {item.label}
              {!!item.badge && item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link to="/parametres">
            <Settings />
            Paramètres
          </Link>
          <Link to="/">
            <ArrowRight />
            Retour au site
          </Link>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="workspace-header">
          <div>
            <span className="text-muted-foreground">{eyebrow}</span>
            <strong>{title}</strong>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <span className="chip">
                {user.firstName} {user.lastName}
              </span>
            )}
            <Button variant="outline" onClick={() => void logout()}>
              <LogOut />
              Se déconnecter
            </Button>
          </div>
        </header>
        <div className={`workspace-content ${right ? "with-right" : ""}`}>
          <main>{children}</main>
          {right && <aside className="workspace-right">{right}</aside>}
        </div>
      </div>
    </div>
  );
}

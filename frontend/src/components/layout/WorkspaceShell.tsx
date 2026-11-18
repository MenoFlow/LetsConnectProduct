// Coquille des espaces protégés (client, entreprise, administrateur).
// Les trois espaces la partagent ; chacun fournit sa navigation.
import type { ReactNode } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { ArrowRight, Building2, LogOut, Settings, ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
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
  admin = false,
}: {
  title: string;
  eyebrow: string;
  organization?: { name: string; detail: string };
  nav: WorkspaceNavItem[];
  children: ReactNode;
  right?: ReactNode;
  admin?: boolean;
}) {
  const user = useCurrentUser();
  const logout = useLogout();

  return (
    <div className={`workspace ${admin ? "admin-workspace" : ""}`}>
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
        <nav className="workspace-nav" aria-label="Navigation de l’espace">
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
          <div className="workspace-heading">
            <span className="text-muted-foreground">{eyebrow}</span>
            {admin ? <h1>{title}</h1> : <strong>{title}</strong>}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" className="account-menu" aria-label="Menu du compte">
              <span className="account-avatar">{user?.firstName.charAt(0)}{user?.lastName.charAt(0)}</span>
              <span className="account-name">{user?.firstName} {user?.lastName}<small>{user?.role === "ADMIN" ? "Administrateur" : user?.role === "COMPANY" ? "Entreprise" : "Client"}</small></span><ChevronDown />
            </Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end"><DropdownMenuLabel>Mon compte</DropdownMenuLabel><DropdownMenuItem asChild><Link to="/parametres"><Settings />Paramètres</Link></DropdownMenuItem><DropdownMenuItem asChild><Link to="/"><ArrowRight />Retour au site</Link></DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => void logout()}><LogOut />Se déconnecter</DropdownMenuItem></DropdownMenuContent>
          </DropdownMenu>
        </header>
        <div className={`workspace-content ${right ? "with-right" : ""}`}>
          <div className="workspace-slot">{children}</div>
          {right && <aside className="workspace-right">{right}</aside>}
        </div>
      </div>
    </div>
  );
}

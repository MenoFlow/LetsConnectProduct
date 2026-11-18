// Boîte à outils des écrans d'administration : confirmations accessibles,
// menus d'action par ligne, pagination, barre d'outils et indicateurs clés.
// Les cinq écrans partagent ces éléments pour rester cohérents.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field } from "@/components/common";
import { pluralize } from "@/lib/format";

/** Confirmation modale : focus rendu à l'élément d'origine à la fermeture. */
export function ConfirmAction({
  open,
  title,
  description,
  busy,
  onClose,
  onConfirm,
  children,
  label = "Confirmer",
  confirmDisabled = false,
}: {
  open: boolean;
  title: string;
  description: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
  children?: ReactNode;
  label?: string;
  confirmDisabled?: boolean;
}) {
  const previous = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open) {
      previous.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !busy) onClose();
      }}
    >
      <DialogContent
        className="admin-dialog"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          previous.current?.focus();
        }}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter className="gap-2">
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            disabled={busy || confirmDisabled}
            onClick={onConfirm}
          >
            {busy ? "Enregistrement…" : label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Menu d'actions par ligne : les actions secondaires ne surchargent plus la ligne. */
export function RowActions({
  name,
  disabled,
  items,
}: {
  name: string;
  disabled?: boolean;
  items: { label: string; action: () => void; destructive?: boolean }[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          disabled={disabled}
          aria-label={`Actions pour ${name}`}
          title={`Actions pour ${name}`}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.label}
            className={item.destructive ? "text-destructive" : undefined}
            onSelect={item.action}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const PAGE_SIZE = 12;

/** Pagination : revient à la première page dès que la recherche ou les filtres changent. */
export function useAdminPagination<T>(rows: T[], filter: string) {
  const [page, setPage] = useState(1);
  const [previousFilter, setPreviousFilter] = useState(filter);
  if (previousFilter !== filter) {
    setPreviousFilter(filter);
    setPage(1);
  }
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages);

  return {
    rows: rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
    control:
      rows.length > PAGE_SIZE ? (
        <nav className="admin-pagination" aria-label="Pagination">
          <span>
            {rows.length} résultats · page {current} sur {pages}
          </span>
          <Button
            size="icon"
            variant="outline"
            aria-label="Page précédente"
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeft />
          </Button>
          <Button
            size="icon"
            variant="outline"
            aria-label="Page suivante"
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            <ChevronRight />
          </Button>
        </nav>
      ) : null,
  };
}

/**
 * Barre d'outils unique d'une liste : recherche, filtres, actions et nombre de
 * résultats au même endroit, au lieu de zones empilées.
 */
export function AdminToolbar({
  search,
  onSearch,
  searchLabel,
  placeholder,
  filters,
  actions,
  total,
  onReset,
  resetLabel = "Réinitialiser",
}: {
  search: string;
  onSearch: (value: string) => void;
  searchLabel: string;
  placeholder: string;
  filters?: ReactNode;
  actions?: ReactNode;
  total: number;
  onReset?: () => void;
  resetLabel?: string;
}) {
  return (
    <section className="admin-toolbar" aria-label="Recherche et filtres">
      <div className="admin-toolbar-fields">
        <Field label={searchLabel}>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={placeholder}
          />
        </Field>
        {filters}
      </div>
      <div className="admin-toolbar-side">
        <p className="admin-toolbar-count" role="status">
          {pluralize(total, "résultat", "résultats")}
        </p>
        <div className="admin-toolbar-actions">
          {actions}
          {onReset && (
            <Button variant="ghost" size="sm" onClick={onReset}>
              {resetLabel}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Indicateur clé : même typographie partout (libellé court, chiffre en
 * tabulaire). Posé dans un lien quand l'indicateur mène à une liste.
 */
export function AdminKpi({
  label,
  value,
  icon: Icon,
  linked = false,
}: {
  label: string;
  value: number;
  icon?: LucideIcon;
  linked?: boolean;
}) {
  return (
    <>
      {Icon && (
        <div className="admin-metric-top">
          <Icon />
          {linked && <ArrowUpRight />}
        </div>
      )}
      <h3 className="kpi-label">{label}</h3>
      <strong className="admin-number">{value}</strong>
    </>
  );
}

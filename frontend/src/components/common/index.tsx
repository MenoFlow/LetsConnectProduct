// Éléments d'interface partagés par toutes les pages.
import { Info, Package } from "lucide-react";
import type { ReactNode } from "react";
import type { CompanyStatus, ProductAvailability, ProductStatus } from "@/types";
import { AVAILABILITY_LABEL, COMPANY_STATUS_LABEL, PRODUCT_STATUS_LABEL } from "@/types";
import { formatPrice } from "@/lib/format";

export function pageHead(title: string, description: string) {
  return {
    meta: [
      { title: `${title} — MatérialConnect` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} — MatérialConnect` },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  };
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function EmptyState({
  icon: Icon = Package,
  title,
  description,
  children,
  compact = false,
}: {
  icon?: typeof Package;
  title: string;
  description?: string;
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`empty-state ${compact ? "compact" : ""}`}>
      <span className="empty-icon">
        <Icon size={30} strokeWidth={1.5} />
      </span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {children}
    </div>
  );
}

export function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

type Tone = "ok" | "wait" | "out" | "neutral";

const COMPANY_TONE: Record<CompanyStatus, Tone> = {
  APPROVED: "ok",
  PENDING: "wait",
  REJECTED: "out",
  SUSPENDED: "out",
};

const PRODUCT_TONE: Record<ProductStatus, Tone> = {
  PUBLISHED: "ok",
  DRAFT: "wait",
  ARCHIVED: "neutral",
};

const AVAILABILITY_TONE: Record<ProductAvailability, Tone> = {
  AVAILABLE: "ok",
  ON_REQUEST: "wait",
  UNAVAILABLE: "out",
};

export function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`status-badge status-${tone}`}>{children}</span>;
}

export function CompanyStatusBadge({ status }: { status: CompanyStatus }) {
  return <StatusBadge tone={COMPANY_TONE[status]}>{COMPANY_STATUS_LABEL[status]}</StatusBadge>;
}

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return <StatusBadge tone={PRODUCT_TONE[status]}>{PRODUCT_STATUS_LABEL[status]}</StatusBadge>;
}

export function AvailabilityBadge({ availability }: { availability: ProductAvailability }) {
  return (
    <StatusBadge tone={AVAILABILITY_TONE[availability]}>
      {AVAILABILITY_LABEL[availability]}
    </StatusBadge>
  );
}

/** Prix unitaire toujours affiché avec son unité de vente. */
export function ProductPrice({
  unitPrice,
  unit,
}: {
  unitPrice: number;
  unit: string;
}) {
  return (
    <p className="product-price">
      {formatPrice(unitPrice)}
      <small> / {unit}</small>
    </p>
  );
}

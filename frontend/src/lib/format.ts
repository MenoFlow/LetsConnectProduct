// Formatage partagé : prix, quantités, dates.

export function formatPrice(value: number): string {
  return `${Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ")} Ar`;
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count > 1 ? plural : singular}`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString("fr-FR");
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** "15 × 20 × 50 cm" → lisible ; sert aussi pour les quantités du panier. */
export function formatQuantity(quantity: number, unit: string): string {
  return `${quantity} ${unit.toLowerCase()}`;
}

// Client HTTP unique vers l'API MatérialConnect.
//
// Tous les appels réseau passent par ici. Ils envoient :
//  - le cookie de session (credentials: "include"), que le backend lit pour
//    identifier l'utilisateur ;
//  - l'en-tête X-Requested-With, que le backend exige sur toute requête qui
//    modifie une donnée (voir backend/src/security.ts).
//
// Par défaut les requêtes partent sur /api : le serveur de développement Vite
// (vite.config.ts) les relaie vers http://localhost:4000. En production on
// définit VITE_API_URL.
const API_BASE = ((import.meta.env["VITE_API_URL"] as string | undefined) ?? "/api").replace(/\/+$/, "");

/** Erreur réseau ou HTTP, avec le message lisible renvoyé par le backend. */
export class ApiError extends Error {
  readonly status: number;
  /** Messages de validation par champ (400) quand le backend les fournit. */
  readonly fields: Record<string, string[]>;

  constructor(status: number, message: string, fields: Record<string, string[]> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

/**
 * Le backend renvoie 401 quand le cookie de session est absent, expiré ou que
 * le compte a été suspendu. L'application enregistre un gestionnaire pour
 * basculer l'écran de connexion.
 */
let sessionExpired: (() => void) | null = null;
export function onSessionExpired(handler: () => void) {
  sessionExpired = handler;
}

export function notifySessionExpired() {
  sessionExpired?.();
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

async function readPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Le backend enveloppe parfois le message dans un objet (400 de validation). */
function messageOf(payload: unknown, status: number): string {
  if (typeof payload === "string" && payload.trim()) return payload;
  if (payload && typeof payload === "object") {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
    if (Array.isArray(message) && message.length) return message.map(String).join(" · ");
    if (message && typeof message === "object") {
      const inner = (message as { message?: unknown }).message;
      if (typeof inner === "string" && inner.trim()) return inner;
    }
  }
  if (status === 400) return "Les informations envoyées sont invalides.";
  if (status === 401) return "Session expirée. Reconnectez-vous.";
  if (status === 403) return "Cette action n'est pas autorisée pour votre compte.";
  if (status === 404) return "Élément introuvable.";
  if (status === 409) return "Cette opération est refusée : conflit de données.";
  if (status === 429) return "Trop de requêtes. Patientez quelques secondes.";
  return "Le serveur a renvoyé une erreur. Réessayez ultérieurement.";
}

/** Errors au format Zod (flatten) : { formErrors, fieldErrors }. */
function fieldsOf(payload: unknown): Record<string, string[]> {
  const source = payload && typeof payload === "object" ? (payload as { message?: unknown }) : null;
  const nested =
    source && source.message && typeof source.message === "object"
      ? (source.message as { errors?: unknown }).errors
      : undefined;
  const errors = (nested ?? (source as { errors?: unknown } | null)?.errors) as
    | { fieldErrors?: Record<string, string[]> }
    | undefined;
  return errors?.fieldErrors && typeof errors.fieldErrors === "object" ? errors.fieldErrors : {};
}

/** Message lisible d'une erreur attrapée dans un écran. */
export const errorMessage = (error: unknown): string =>
  error instanceof Error && error.message.trim()
    ? error.message
    : "Opération impossible. Réessayez.";

export async function api<T>(
  path: string,
  options: { method?: Method; body?: unknown } = {},
): Promise<T> {
  const method = options.method ?? "GET";
  const hasBody = options.body !== undefined;
  const init: RequestInit & { credentials: RequestCredentials } = {
    method,
    credentials: "include",
    headers: {
      "X-Requested-With": "MaterialConnect",
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
    },
  };
  if (hasBody) init.body = JSON.stringify(options.body);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, init);
  } catch {
    throw new ApiError(0, "API injoignable : vérifiez que le backend tourne sur le port 4000.");
  }

  const payload = await readPayload(response);

  if (!response.ok) {
    if (response.status === 401) notifySessionExpired();
    throw new ApiError(response.status, messageOf(payload, response.status), fieldsOf(payload));
  }
  return payload as T;
}

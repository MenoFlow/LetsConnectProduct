// Démarrage de l'application : la session est vérifiée auprès du backend, puis
// les données correspondantes sont chargées. Rien n'est lu dans le localStorage.
import { useAuthStore } from "./authStore";

let started: Promise<void> | null = null;

/**
 * Vérifie la session (GET /api/auth/me) et charge soit l'espace de travail de
 * l'utilisateur, soit les données publiques. Appel unique et partageable : les
 * routes protégées peuvent l'attendre sans relancer la requête.
 */
export function bootstrap(): Promise<void> {
  if (!started) started = useAuthStore.getState().loadSession();
  return started;
}

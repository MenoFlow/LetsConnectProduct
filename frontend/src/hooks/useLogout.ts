// Déconnexion puis retour à la page de connexion, depuis n'importe quel bouton.
import { useNavigate } from "@tanstack/react-router";
import { useAuthStore } from "@/stores/authStore";

export function useLogout() {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  return async () => {
    try {
      await logout();
    } finally {
      await navigate({ to: "/connexion" });
    }
  };
}

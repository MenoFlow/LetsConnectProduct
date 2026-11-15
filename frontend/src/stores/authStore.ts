// Session de l'utilisateur connecté.
//
// Le navigateur ne conserve plus ni identité ni mot de passe : la session lives
// dans le cookie httpOnly `mc_session` posé par le backend. Cette store garde
// seulement la copie en mémoire de l'utilisateur renvoyé par GET /api/auth/me,
// et déclenche le chargement des données correspondantes.
import { create } from "zustand";
import { api, ApiError, errorMessage } from "@/lib/api";
import { normalizeUser } from "@/lib/normalize";
import { loadPublicData, loadWorkspace } from "@/stores/dbStore";
import type { User } from "@/types";

export type AuthStatus = "unknown" | "loading" | "ready";

export interface RegistrationInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "CLIENT" | "COMPANY";
  /** Requis lorsque role === "COMPANY". */
  companyName?: string;
  city?: string;
  businessSector?: string;
}

type AuthState = {
  user: User | null;
  status: AuthStatus;
  error: string | null;
  /** Vérifie la session au démarrage : /api/auth/me, puis données publiques ou espace de travail. */
  loadSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegistrationInput) => Promise<User>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, password: string) => Promise<void>;
  /** Efface la session après un 401 de l'API (cookie expiré, compte suspendu). */
  clearSession: () => void;
  clearError: () => void;
};

const isUnauthorized = (error: unknown) => error instanceof ApiError && error.status === 401;

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  status: "unknown",
  error: null,

  loadSession: async () => {
    set({ status: "loading", error: null });
    try {
      const user = normalizeUser(await api<User>("/auth/me"));
      set({ user, status: "ready" });
      await loadWorkspace();
    } catch (error) {
      // 401 = pas de session : on bascule sur les données publiques, sans erreur.
      if (isUnauthorized(error)) {
        set({ user: null, status: "ready", error: null });
        await loadPublicData();
        return;
      }
      set({ user: null, status: "ready", error: errorMessage(error) });
    }
  },

  login: async (email, password) => {
    set({ error: null, status: "loading" });
    try {
      const user = normalizeUser(
        await api<User>("/auth/login", { method: "POST", body: { email, password } }),
      );
      set({ user, status: "ready", error: null });
      await loadWorkspace();
      return user;
    } catch (error) {
      set({ status: "ready", error: errorMessage(error) });
      throw error;
    }
  },

  register: async (input) => {
    set({ error: null, status: "loading" });
    try {
      const user = normalizeUser(
        await api<User>("/auth/register", { method: "POST", body: input }),
      );
      set({ user, status: "ready", error: null });
      await loadWorkspace();
      return user;
    } catch (error) {
      set({ status: "ready", error: errorMessage(error) });
      throw error;
    }
  },

  logout: async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      set({ user: null, status: "ready", error: null });
      await loadPublicData();
    }
  },

  changePassword: async (currentPassword, password) => {
    try {
      await api("/auth/password", { method: "POST", body: { currentPassword, password } });
    } catch (error) {
      set({ error: errorMessage(error) });
      throw error;
    }
  },

  clearSession: () => {
    set({ user: null, status: "ready", error: null });
    void loadPublicData();
  },

  clearError: () => set({ error: null }),
}));

/** Utilisateur connecté, ou undefined si personne n'est connecté. */
export function getCurrentUser(): User | undefined {
  return useAuthStore.getState().user ?? undefined;
}

export function useCurrentUser(): User | undefined {
  return useAuthStore((state) => state.user ?? undefined);
}

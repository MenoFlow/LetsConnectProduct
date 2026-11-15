// Entreprise active pour l'utilisateur connecté.
//
// Ce n'est pas une donnée : c'est un simple choix d'affichage (quelle entreprise
// afficher quand un compte en gère plusieurs). Il est donc gardé en mémoire,
// jamais dans le localStorage — les vraies données viennent de l'API.
import { create } from "zustand";
import { useDbStore } from "./dbStore";
import { useCurrentUser } from "./authStore";
import type { Company, CompanyMember, MembershipRole } from "@/types";

type CompanyState = {
  activeCompanyId: string | null;
  setActiveCompany: (companyId: string | null) => void;
};

export const useCompanyStore = create<CompanyState>()((set) => ({
  activeCompanyId: null,
  setActiveCompany: (companyId) => set({ activeCompanyId: companyId }),
}));

/** Liaison de l'utilisateur connecté avec l'entreprise active. */
export function getMembership(
  userId: string | undefined,
  companyId?: string,
): CompanyMember | undefined {
  if (!userId) return undefined;
  const { companyMembers } = useDbStore.getState();
  const target = companyId ?? useCompanyStore.getState().activeCompanyId;
  if (target) {
    return companyMembers.find((m) => m.userId === userId && m.companyId === target);
  }
  return companyMembers.find((m) => m.userId === userId);
}

export function useMyMembership(): CompanyMember | undefined {
  const user = useCurrentUser();
  const members = useDbStore((state) => state.companyMembers);
  const activeCompanyId = useCompanyStore((state) => state.activeCompanyId);
  if (!user) return undefined;
  return (
    members.find(
      (m) => m.userId === user.id && (!activeCompanyId || m.companyId === activeCompanyId),
    ) ?? members.find((m) => m.userId === user.id)
  );
}

/** Entreprise que l'utilisateur connecté gère (via sa liaison de membre). */
export function useCurrentCompany(): Company | undefined {
  const membership = useMyMembership();
  const companies = useDbStore((state) => state.companies);
  if (!membership) return undefined;
  return companies.find((c) => c.id === membership.companyId);
}

export function useMyRole(): MembershipRole | undefined {
  return useMyMembership()?.membershipRole;
}

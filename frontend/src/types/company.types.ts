// Entreprise, ses membres, ses favoris et ses statistiques.
// Toutes les relations sont plates : ownerId, companyId, userId.

export type CompanyStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
export type MembershipRole = "OWNER" | "MANAGER" | "EDITOR";

export interface Company {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description: string;
  logo?: string;
  coverImage?: string;
  email: string;
  phone: string;
  website?: string;
  address: string;
  city: string;
  country: string;
  businessSector: string;
  status: CompanyStatus;
  isVerified: boolean;
  createdAt: string;
  // Champs additionnels conservés pour l'affichage de la fiche publique.
  region?: string;
  hours?: string;
  // Suivi de la demande d'inscription.
  reviewNote?: string;
  reviewedAt?: string;
  submittedAt?: string;
}

/** Liaison utilisateur ⇄ entreprise avec le rôle interne du membre. */
export interface CompanyMember {
  id: string;
  userId: string;
  companyId: string;
  membershipRole: MembershipRole;
}

/** Entreprise mise de côté par un client. */
export interface Favorite {
  id: string;
  userId: string;
  companyId: string;
  createdAt: string;
}

/** Point d'activité mensuel d'une entreprise (alimente les statistiques). */
export interface ActivityRecord {
  id: string;
  companyId: string;
  date: string;
  profileViews: number;
  productViews: number;
  messages: number;
}

export const COMPANY_STATUS_LABEL: Record<CompanyStatus, string> = {
  PENDING: "En attente de validation",
  APPROVED: "Approuvée",
  REJECTED: "Rejetée",
  SUSPENDED: "Suspendue",
};

export const MEMBERSHIP_ROLE_LABEL: Record<MembershipRole, string> = {
  OWNER: "Propriétaire",
  MANAGER: "Gérant",
  EDITOR: "Éditeur",
};

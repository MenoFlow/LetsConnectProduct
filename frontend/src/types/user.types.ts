// Rôles et comptes. Les identifiants de démonstration sont séparés de User :
// le futur backend n'a rien à savoir d'un mot de passe côté client.

export type UserRole = "CLIENT" | "COMPANY" | "ADMIN";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

/** Compte de démonstration : email + mot de passe + utilisateur lié. */
export interface DemoAccount {
  email: string;
  password: string;
  userId: string;
  label: string;
}

export const fullName = (user: User) => `${user.firstName} ${user.lastName}`;

// Forme exacte des données que l'API renvoie au navigateur.
// C'est le contrat partagé entre l'API et l'application : il n'existe plus de
// « base de démonstration » côté navigateur, ces tables sont servies par le
// backend (GET /api/workspace, GET /api/public/snapshot).
import type { ActivityRecord, Company, CompanyMember, Favorite } from "./company.types";
import type { Category, Product } from "./product.types";
import type { Conversation, MessageRecord } from "./message.types";
import type { User } from "./user.types";

export interface Database {
  users: User[];
  companies: Company[];
  companyMembers: CompanyMember[];
  categories: Category[];
  products: Product[];
  conversations: Conversation[];
  messages: MessageRecord[];
  favorites: Favorite[];
  activity: ActivityRecord[];
}

export const EMPTY_DATABASE: Database = {
  users: [],
  companies: [],
  companyMembers: [],
  categories: [],
  products: [],
  conversations: [],
  messages: [],
  favorites: [],
  activity: [],
};

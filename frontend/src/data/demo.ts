// Comptes créés par le script de démarrage de la base (backend : bun run seed).
// Ils servent uniquement à essayer les trois rôles : le mot de passe est
// volontairement faible et ces comptes ne doivent pas exister en production.
export const DEMO_PASSWORD = "demo1234";

export interface DemoAccount {
  email: string;
  password: string;
  label: string;
}

export const demoAccounts: DemoAccount[] = [
  { email: "client@materialconnect.mg", password: DEMO_PASSWORD, label: "Client" },
  { email: "company@materialconnect.mg", password: DEMO_PASSWORD, label: "Entreprise" },
  { email: "admin@materialconnect.mg", password: DEMO_PASSWORD, label: "Administrateur" },
];

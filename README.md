# MatérialConnect — backend + frontend

Deux projets indépendants du reste du dépôt :

| Dossier | Rôle |
| --- | --- |
| `backend/` | API NestJS + PostgreSQL (Prisma), session par cookie `httpOnly` |
| `frontend/` | Application React (TanStack Router) qui parle à cette API |

Le frontend n'a aucune donnée en local : il lit et écrit uniquement via l'API.
La session vit dans le cookie `mc_session` posé par le backend.

MatérialConnect met en relation les clients et les vendeurs de **matières
premières**, et non de matériaux de construction : métaux industriels et
précieux, minéraux, énergie, céréales et cultures, fibres et bois, produits
d’origine animale et bétail. Les données de départ comportent 7 catégories,
9 entreprises et 26 produits (cuivre, bauxite, café, riz, coton, zébus…).

La messagerie occupe la hauteur de la fenêtre : seuls les contacts et les
messages défilent. Sur petit écran, ouvrir un contact affiche la conversation ;
la flèche de retour ramène aux contacts. La déconnexion mène à `/connexion`.

---

## 1. Démarrer la base PostgreSQL et pgAdmin

Une seule commande, à la racine de `fullstack/` :

```bash
docker compose up -d
```

- PostgreSQL : port `5432`, base `materialconnect`, utilisateur `materialconnect`
- pgAdmin : <http://localhost:5050> (identifiants par défaut du fichier compose)

Pour s'arrêter : `docker compose down`. Pour repartir d'une base vide :
`docker compose down -v`.

---

## 2. Configurer le backend

```bash
cd backend
cp .env.example .env
```

`.env` contient :

| Clé | Rôle |
| --- | --- |
| `DATABASE_URL` | URL de connexion à PostgreSQL (celle de Docker Compose) |
| `FRONTEND_ORIGIN` | Origine exacte du frontend, vérifiée par CORS et la protection CSRF |
| `PORT` | Port d'écoute de l'API (`4000`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Compte administrateur créé par le script de démarrage |
| `NODE_ENV` | Environnement d'exécution |

> Si vous utilisez le compte `materialconnect` de Docker Compose, gardez la
> `DATABASE_URL` de `.env.example`. Si votre serveur PostgreSQL local n'accepte
> que `postgres`, remplacez la partie utilisateur/mot de passe de l'URL.

---

## 3. Installer, générer le client Prisma, créer les tables

```bash
cd backend
bun install                 # ou npm install
bun run generate            # prisma generate : génère le client Prisma
bun run migrate             # prisma migrate deploy : applique la migration 0001_init
bun run seed                # charge les comptes et données de démonstration
```

`prisma migrate deploy` rejoue la migration déjà écrite
(`prisma/migrations/0001_init/migration.sql`). Pour créer une **nouvelle**
migration après un changement de `prisma/schema.prisma` :

```bash
bunx prisma migrate dev --name nom_de_la_migration
```

Le script de démarrage (`prisma/seed.ts`) est idempotent : il peut être relancé.
Il crée 14 comptes de démonstration (mot de passe commun `demo1234`) et le
compte administrateur défini par `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

Après une mise à jour du catalogue de départ, relancer `bun run seed` sur une
base de développement. Les lignes partageant les mêmes identifiants sont mises
à jour ; les anciennes lignes avec d’autres identifiants ne sont pas supprimées.
Pour repartir d’un catalogue propre, recréer uniquement une base de test ou de
développement jetable, puis migrer et charger les données. **Ne pas utiliser le
seed ni `docker compose down -v` sur une base contenant des données réelles** :
le seed réécrit aussi les mots de passe des comptes de départ et `down -v`
supprime la base entière.

---

## 4. Lancer le backend

```bash
cd backend
bun run dev      # http://localhost:4000/api (rechargement à chaque modification)
```

Vérification rapide :

```bash
curl http://localhost:4000/api/public/snapshot | head -c 200
```

La réponse doit commencer par des entreprises approuvées et des produits publiés.

> `bun run dev` utilise `nodemon` + `ts-node` : `tsx` n'émet pas les métadonnées
> des décorateurs Nest, ce qui casse l'injection de dépendances au démarrage.

---

## 5. Lancer le frontend

Dans un second terminal :

```bash
cd frontend
bun install                 # ou npm install
cp .env.example .env        # optionnel : VITE_API_URL=/api suffit en local
bun run dev                 # http://localhost:3000
```

Le serveur de développement Vite relaie `/api` vers `http://localhost:4000`
(voir `frontend/vite.config.ts`). `VITE_API_URL` ne sert qu'à pointer l'API sur
une autre origine.

Ouvrir <http://localhost:3000>, puis se connecter avec un compte de démonstration :

| Rôle | Email | Mot de passe |
| --- | --- | --- |
| Client | `client@materialconnect.mg` | `demo1234` |
| Entreprise | `company@materialconnect.mg` | `demo1234` |
| Administrateur | `admin@materialconnect.mg` | `demo1234` |

Si `ADMIN_EMAIL` correspond à l’email du compte administrateur ci-dessus,
son mot de passe est `ADMIN_PASSWORD`, et non `demo1234`. Les raccourcis de
connexion aux comptes de départ ne sont pas affichés dans l’application.

---

## 6. Tests

```bash
# Backend : tests d'intégration (auth, rôles, produits, panier, messagerie)
cd backend
cp .env.example .env            # si ce n'est pas déjà fait
bun run test                    # vitest run
# Créer materialconnect_test au préalable ; ses tables sont migrées automatiquement.
# On peut la forcer avec TEST_DATABASE_URL.

# Frontend : tests (règles du catalogue, panier, session, validation, routes)
cd frontend
bun run test
```

Les tests du frontend simulent l'API (`fetch`) : ils n'ont pas besoin que le
backend tourne.

Vérifications effectuées le 15 novembre 2026 : **52 tests backend** sur une
base PostgreSQL jetable et **55 tests frontend** réussis. Dans le navigateur,
les espaces client et entreprise ont envoyé puis relu des messages après
actualisation, sans défilement de page à 1280, 517 et 390 px de largeur. La
déconnexion des trois rôles ramène à `/connexion` et invalide la session côté
serveur. Docker et pgAdmin restent à vérifier sur l'hébergement cible : Docker
n'était pas disponible dans l'environnement de vérification.

---

## 7. Notes de sécurité

- Le cookie de session est `httpOnly`, `sameSite=lax`, et expiré après
  30 jours ; le changement de mot de passe ferme toutes les sessions.
- Toute requête qui modifie une donnée doit venir de `FRONTEND_ORIGIN` et
  porter l'en-tête `X-Requested-With: MaterialConnect` (protection CSRF).
- Les règles de rôle (client, entreprise, administrateur) sont appliquées par
  le backend. Les contrôles du frontend ne sont que de l'affichage.
- En production : définissez `FRONTEND_ORIGIN` sur le domaine réel, changez
  `ADMIN_PASSWORD`, et activez `COOKIE_SECURE`.

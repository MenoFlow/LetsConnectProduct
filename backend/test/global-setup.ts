// Préparé une seule fois avant les tests : la base de test est migrée, pour que
// chaque fichier de test parte d'un schéma à jour.
//
// L'URL est reprise de test-database.ts : ce fichier est exécuté par Vitest
// lui-même, avant toute transformation, et ne peut donc pas importer un module
// TypeScript du projet.
import {execSync} from 'node:child_process';

const TEST_DATABASE_URL =
 process.env['TEST_DATABASE_URL'] ??
 'postgresql://postgres@127.0.0.1:5432/materialconnect_test?schema=public';

export default function setup(){
 execSync('bunx prisma migrate deploy --schema prisma/schema.prisma', {
  cwd: process.cwd(),
  env: {...process.env, DATABASE_URL: TEST_DATABASE_URL},
  stdio: 'inherit',
 });
}

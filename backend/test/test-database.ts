// Base de test partagée par les fichiers de test.
//
// Elle est volontairement séparée de la base de développement : les tests
// vident et remplissent des tables sans jamais toucher aux données de
// démonstration. Elle se remplace par TEST_DATABASE_URL.
export const TEST_DATABASE_URL =
 process.env['TEST_DATABASE_URL'] ??
 'postgresql://postgres@127.0.0.1:5432/materialconnect_test?schema=public';

// L'application lit la base et l'origine autorisée dans l'environnement : ces
// valeurs sont posées avant la création du module Nest.
process.env['DATABASE_URL'] = TEST_DATABASE_URL;
process.env['FRONTEND_ORIGIN'] = process.env['FRONTEND_ORIGIN'] ?? 'http://localhost:3000';
process.env['NODE_ENV'] = 'test';

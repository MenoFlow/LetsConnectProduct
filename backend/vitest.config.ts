import swc from 'unplugin-swc';
import {defineConfig} from 'vitest/config';

// Nest lit les types des constructeurs dans les métadonnées d'decorators.
// esbuild (le transformateur par défaut de Vitest) ne les produit pas : sans
// SWC, toutes les injections de dépendances valent undefined et l'application
// ne démarre pas.
export default defineConfig({
 test: {
  include: ['test/**/*.test.ts'],
  globals: true,
  // Une seule base de test : les fichiers tournent l'un après l'autre.
  fileParallelism: false,
  globalSetup: ['test/global-setup.ts'],
  hookTimeout: 120_000,
  testTimeout: 60_000,
 },
 plugins: [swc.vite({
  jsc: {
   parser: {syntax: 'typescript', decorators: true},
   transform: {legacyDecorator: true, decoratorMetadata: true},
   target: 'es2022',
  },
  // Vitest est distribué en modules ES : une sortie CommonJS casserait
  // l'import de `vitest` dans les fichiers de test.
  module: {type: 'es6'},
 })],
});

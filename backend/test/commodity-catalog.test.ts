import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const data = JSON.parse(readFileSync(new URL('../prisma/seed-data.json', import.meta.url), 'utf8')) as {
 categories: {id: string; name: string}[];
 products: {name: string; categoryId: string}[];
};

describe('catalogue de matières premières', () => {
 it.each([
  ['metaux-industriels', 'Cuivre', 'Aluminium', 'Minerai de fer'],
  ['metaux-precieux', 'Or', 'Argent'],
  ['mineraux', 'Bauxite', 'Sable', 'Argile', 'Sel'],
  ['energie', 'Pétrole brut', 'Gaz naturel', 'Charbon'],
  ['cereales-cultures', 'Riz', 'Blé', 'Maïs', 'Soja', 'Café', 'Cacao', 'Sucre'],
  ['fibres-bois', 'Coton', 'Grumes', 'Latex'],
  ['produits-animaux', 'Zébus'],
 ])('propose les matières premières de %s', (categoryId, ...materials) => {
  expect(data.categories.some(c => c.id === categoryId)).toBe(true);
  const names = data.products.filter(p => p.categoryId === categoryId).map(p => p.name.toLocaleLowerCase('fr')).join(' ');
  for (const material of materials) expect(names).toContain(material.toLocaleLowerCase('fr'));
 });

 it('ne contient pas de produits de construction transformés', () => {
  expect(data.products.filter(p => /\b(ciment|béton|briques?|parpaings?|fer à béton|carrelage)\b/i.test(p.name))).toEqual([]);
 });

 it('accepte le nickel en briquettes comme métal industriel, pas comme brique de construction', () => {
  expect(data.products.find(p => p.name === 'Nickel en briquettes')?.categoryId).toBe('metaux-industriels');
 });
});
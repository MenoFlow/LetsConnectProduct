// Le cache des données est rempli par l'API ; les tests le remplissent à la
// main et simulent fetch. Chaque test repart donc d'un cache vide.
import { afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

afterEach(() => {
  vi.unstubAllGlobals();
});

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: () => {},
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

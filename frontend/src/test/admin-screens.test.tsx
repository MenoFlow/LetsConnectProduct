// Règles des écrans d'administration : protection des comptes, confirmation
// explicite avant suspension, suppression de catégorie refusée tant qu'elle est
// utilisée, et traitement des inscriptions en attente depuis le tableau de bord.
import { QueryClient } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { AdminCategoriesPage } from "@/pages/admin/AdminCategoriesPage";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { useAuthStore } from "@/stores/authStore";
import {
  admin,
  approvedCompany,
  category,
  client,
  draftProduct,
  fillDb,
  json,
  metalsCategory,
  noContent,
  pendingCompany,
  publishedProduct,
  resetStores,
  stubFetch,
  suspendedClient,
} from "./fixtures";

beforeEach(() => {
  resetStores();
  useAuthStore.setState({ user: admin, status: "ready", error: null });
});

/** Ouvre une route de l'espace administrateur, garde en main comme dans l'app. */
async function renderAdminRoute(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
    context: { queryClient: new QueryClient() },
  });
  // La route protégée doit être résolue avant le premier rendu.
  await router.load();
  return render(<RouterProvider router={router} />);
}

describe("Écran Utilisateurs", () => {
  it("marque « Protégé » le compte d'administration et le compte connecté", () => {
    fillDb({ users: [admin, client, suspendedClient] });
    useAuthStore.setState({ user: admin, status: "ready", error: null });
    render(<AdminUsersPage />);

    // Le compte connecté EST le compte administrateur : sa ligne est verrouillée.
    expect(screen.getAllByText("Protégé")).toHaveLength(1);
    const adminRow = screen.getByText("admin@exemple.mg").closest("tr");
    expect(within(adminRow!).getByText("Protégé")).toBeInTheDocument();
    expect(within(adminRow!).queryByRole("button")).toBeNull();
    // Un autre compte, lui, reste suspendable et réactivable.
    expect(screen.getByRole("button", { name: "Suspendre" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Réactiver" })).toBeInTheDocument();
  });

  it("protège le compte connecté même quand il n'est pas administrateur", () => {
    fillDb({ users: [admin, client, suspendedClient] });
    useAuthStore.setState({ user: client, status: "ready", error: null });
    render(<AdminUsersPage />);

    // Deux lignes protégées : le compte administrateur et le compte connecté.
    expect(screen.getAllByText("Protégé")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Suspendre" })).toBeNull();
  });

  it("demande une confirmation explicite avant de suspendre un compte", async () => {
    const calls = stubFetch(() => json({ ...client, isActive: false }));
    fillDb({ users: [admin, client, suspendedClient] });
    render(<AdminUsersPage />);

    fireEvent.click(screen.getByRole("button", { name: "Suspendre" }));

    // La modale s'ouvre, et rien n'est encore envoyé au serveur.
    expect(screen.getByText(/ne pourra plus se connecter/)).toBeInTheDocument();
    expect(calls).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Suspendre le compte" }));

    await waitFor(() => {
      expect(
        calls.some(
          (call) => call.method === "PATCH" && call.url.includes("/users/u-3/active"),
        ),
      ).toBe(true);
    });
    expect(
      calls.find((call) => call.url.includes("/users/u-3/active"))?.body,
    ).toEqual({ isActive: false });
  });
});

describe("Écran Catégories", () => {
  it("refuse de supprimer une catégorie encore utilisée par des produits", async () => {
    const calls = stubFetch(() => noContent());
    fillDb({
      categories: [category, metalsCategory],
      products: [publishedProduct, draftProduct],
    });
    render(<AdminCategoriesPage />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Actions pour Minéraux" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Supprimer" }));

    // Le motif est affiché et la confirmation reste impossible.
    expect(await screen.findByText(/Suppression impossible/)).toBeInTheDocument();
    expect(screen.getByText(/1 produit utilise encore cette catégorie/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Supprimer la catégorie" }),
    ).toBeDisabled();
    expect(calls.filter((call) => call.method === "DELETE")).toHaveLength(0);
  });

  it("renomme une catégorie par un dialogue, sans changer son identifiant", async () => {
    const calls = stubFetch(() => json({ ...category, name: "Minéraux lourds" }));
    fillDb({
      categories: [category, metalsCategory],
      products: [publishedProduct, draftProduct],
    });
    render(<AdminCategoriesPage />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Actions pour Minéraux" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Renommer" }));

    // La carte d'ajout porte le même libellé : on cible bien le dialogue ouvert.
    const dialog = await screen.findByRole("dialog");
    const field = within(dialog).getByLabelText("Nom de la catégorie");
    fireEvent.change(field, { target: { value: "Minéraux lourds" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => {
      expect(
        calls.some(
          (call) => call.method === "PATCH" && call.url.includes("/categories/cat-sable"),
        ),
      ).toBe(true);
    });
    expect(
      calls.find((call) => call.url.includes("/categories/cat-sable"))?.body,
    ).toEqual({ name: "Minéraux lourds" });
  });
});

describe("Tableau de bord administrateur", () => {
  it("approuve une inscription en attente sans changer d'écran", async () => {
    const calls = stubFetch(() => json({ ...pendingCompany, status: "APPROVED" }));
    fillDb({
      users: [admin],
      companies: [approvedCompany, pendingCompany],
      categories: [],
      products: [],
    });
    await renderAdminRoute("/admin/dashboard");

    fireEvent.click(await screen.findByRole("button", { name: "Approuver" }));
    await waitFor(() => {
      expect(
        calls.some(
          (call) =>
            call.method === "POST" && call.url.includes("/companies/c-pending/review"),
        ),
      ).toBe(true);
    });
    expect(
      calls.find((call) => call.url.includes("/companies/c-pending/review"))?.body,
    ).toEqual({ status: "APPROVED" });
  });

  it("exige un motif avant de rejeter une inscription en attente", async () => {
    const calls = stubFetch(() => json({ ...pendingCompany, status: "REJECTED" }));
    fillDb({
      users: [admin],
      companies: [approvedCompany, pendingCompany],
      categories: [],
      products: [],
    });
    await renderAdminRoute("/admin/dashboard");

    fireEvent.click(await screen.findByRole("button", { name: "Rejeter" }));

    expect(await screen.findByText(/Un motif est obligatoire/)).toBeInTheDocument();
    expect(calls).toHaveLength(0);
    expect(
      screen.getByRole("button", { name: "Refuser la demande" }),
    ).toBeDisabled();
  });
});

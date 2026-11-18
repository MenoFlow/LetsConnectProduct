// Les paramètres du compte restent dans la coquille du rôle connecté : depuis
// un espace protégé, aucun retour à la mise en page publique.
import { QueryClient } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { useAuthStore } from "@/stores/authStore";
import {
  approvedCompany,
  client,
  fillDb,
  owner,
  resetStores,
  stubFetch,
} from "./fixtures";

beforeEach(() => {
  resetStores();
  stubFetch(() => new Response(null, { status: 204 }));
  fillDb({ users: [owner, client], companies: [approvedCompany] });
});

async function renderRoute(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
    context: { queryClient: new QueryClient() },
  });
  await router.load();
  return render(<RouterProvider router={router} />);
}

describe("Paramètres du compte", () => {
  it("gardent la coquille de l'espace entreprise", async () => {
    useAuthStore.setState({ user: owner, status: "ready", error: null });
    await renderRoute("/parametres");

    await waitFor(() => expect(screen.getByText("Espace professionnel")).toBeInTheDocument());
    expect(
      screen.getByRole("heading", { level: 1, name: "Paramètres du compte" }),
    ).toBeInTheDocument();
    // Aucune trace de la mise en page publique.
    expect(document.querySelector(".page-main")).toBeNull();
  });

  it("gardent la coquille de l'espace client", async () => {
    useAuthStore.setState({ user: client, status: "ready", error: null });
    await renderRoute("/parametres");

    await waitFor(() => expect(screen.getByText("Espace client")).toBeInTheDocument());
    expect(
      screen.getByRole("heading", { level: 1, name: "Paramètres du compte" }),
    ).toBeInTheDocument();
    expect(document.querySelector(".page-main")).toBeNull();
  });
});

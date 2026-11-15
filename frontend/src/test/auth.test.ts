import { beforeEach, describe, expect, it, vi } from "vitest";
import { onSessionExpired } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useDbStore } from "@/stores/dbStore";
import { client, json, noContent, resetStores, stubFetch } from "@/test/fixtures";

// La session vit dans le cookie httpOnly posé par le backend : le navigateur ne
// garde que la copie en mémoire de l'utilisateur renvoyé par l'API.
describe("session", () => {
  beforeEach(() => {
    resetStores();
  });

  it("connecte un compte puis charge son espace de travail", async () => {
    const calls = stubFetch((url) => {
      if (url === "/api/auth/login") return json(client);
      if (url === "/api/workspace") return json({ users: [client] });
      return json({ message: "Route inattendue." }, 404);
    });

    const user = await useAuthStore.getState().login("client@exemple.mg", "demo1234");

    expect(user.id).toBe("u-3");
    expect(useAuthStore.getState().user?.id).toBe("u-3");
    expect(calls[0]).toMatchObject({
      url: "/api/auth/login",
      method: "POST",
      credentials: "include",
      body: { email: "client@exemple.mg", password: "demo1234" },
    });
    expect(calls[0]!.headers["X-Requested-With"]).toBe("MaterialConnect");
    expect(calls[1]!.url).toBe("/api/workspace");
    expect(useDbStore.getState().users.map((u) => u.id)).toEqual(["u-3"]);
  });

  it("refuse un mot de passe incorrect avec le message du serveur", async () => {
    stubFetch(() => json({ message: "Email ou mot de passe incorrect." }, 401));

    await expect(
      useAuthStore.getState().login("client@exemple.mg", "mauvais"),
    ).rejects.toThrow("Email ou mot de passe incorrect.");
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().error).toBe("Email ou mot de passe incorrect.");
  });

  it("reste sur les données publiques quand aucune session n'existe", async () => {
    const calls = stubFetch((url) => {
      if (url === "/api/auth/me") return json({ message: "Session expirée." }, 401);
      if (url === "/api/public/snapshot") return json({ users: [client] });
      return json({ message: "Route inattendue." }, 404);
    });

    await useAuthStore.getState().loadSession();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().status).toBe("ready");
    expect(useAuthStore.getState().error).toBeNull();
    expect(calls.map((call) => call.url)).toEqual(["/api/auth/me", "/api/public/snapshot"]);
    expect(useDbStore.getState().status).toBe("ready");
  });

  it("restaure la session du cookie au démarrage", async () => {
    const calls = stubFetch((url) => {
      if (url === "/api/auth/me") return json(client);
      if (url === "/api/workspace") return json({ users: [client] });
      return json({ message: "Route inattendue." }, 404);
    });

    await useAuthStore.getState().loadSession();

    expect(useAuthStore.getState().user?.id).toBe("u-3");
    expect(calls.map((call) => call.url)).toEqual(["/api/auth/me", "/api/workspace"]);
  });

  it("déconnecte en prévenant le serveur puis recharge les données publiques", async () => {
    const calls = stubFetch((url) => {
      if (url === "/api/auth/login") return json(client);
      if (url === "/api/workspace") return json({ users: [client] });
      if (url === "/api/auth/logout") return noContent();
      if (url === "/api/public/snapshot") return json({ users: [] });
      return json({ message: "Route inattendue." }, 404);
    });

    await useAuthStore.getState().login("client@exemple.mg", "demo1234");
    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().user).toBeNull();
    expect(calls.map((call) => call.url)).toEqual([
      "/api/auth/login",
      "/api/workspace",
      "/api/auth/logout",
      "/api/public/snapshot",
    ]);
    expect(calls[2]!.method).toBe("POST");
  });

  it("change le mot de passe avec l'ancien et le nouveau", async () => {
    const calls = stubFetch((url) =>
      url === "/api/auth/password" ? noContent() : json({ message: "Route inattendue." }, 404),
    );

    await useAuthStore.getState().changePassword("ancien-mot-de-passe", "nouveau-mot-de-passe");

    expect(calls[0]).toMatchObject({
      url: "/api/auth/password",
      method: "POST",
      credentials: "include",
      body: { currentPassword: "ancien-mot-de-passe", password: "nouveau-mot-de-passe" },
    });
  });

  it("rapporte le refus du serveur lors d'un changement de mot de passe", async () => {
    stubFetch(() => json({ message: "Mot de passe actuel incorrect." }, 400));

    await expect(
      useAuthStore.getState().changePassword("faux", "nouveau-mot-de-passe"),
    ).rejects.toThrow("Mot de passe actuel incorrect.");
    expect(useAuthStore.getState().error).toBe("Mot de passe actuel incorrect.");
  });

  it("prévient l'application quand le serveur renvoie 401", async () => {
    const expired = vi.fn();
    onSessionExpired(expired);
    stubFetch((url) =>
      url === "/api/auth/me"
        ? json({ message: "Session expirée." }, 401)
        : json({ users: [] }),
    );

    await expect(useAuthStore.getState().loadSession()).resolves.toBeUndefined();
    expect(expired).toHaveBeenCalledTimes(1);

    onSessionExpired(() => {});
  });
});

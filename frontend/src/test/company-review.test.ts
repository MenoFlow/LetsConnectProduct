import { beforeEach, describe, expect, it } from "vitest";
import { resubmitCompany, setCompanyStatus } from "@/data/repository";
import { useDbStore } from "@/stores/dbStore";
import {
  fillDb,
  json,
  noContent,
  pendingCompany,
  rejectedCompany,
  resetStores,
  stubFetch,
} from "@/test/fixtures";

// Les transitions de validation sont décidentées par le backend : le cache n'est
// mis à jour qu'avec la réponse du serveur.
const current = () =>
  useDbStore.getState().companies.find((company) => company.id === pendingCompany.id)!;

describe("validation des entreprises", () => {
  beforeEach(() => {
    resetStores();
    fillDb({ companies: [pendingCompany, rejectedCompany] });
  });

  it("envoie la décision au serveur et enregistre sa réponse", async () => {
    const calls = stubFetch((url) =>
      url === "/api/companies/c-pending/review"
        ? json({
            ...pendingCompany,
            status: "APPROVED",
            isVerified: true,
            reviewedAt: "2026-02-01T00:00:00.000Z",
          })
        : json({ message: "Route inattendue." }, 404),
    );

    const saved = await setCompanyStatus("c-pending", "APPROVED");

    expect(calls[0]).toMatchObject({
      url: "/api/companies/c-pending/review",
      method: "POST",
      credentials: "include",
      body: { status: "APPROVED" },
    });
    expect(saved.status).toBe("APPROVED");
    expect(current().status).toBe("APPROVED");
    expect(current().isVerified).toBe(true);
    expect(current().reviewedAt).toBe("2026-02-01T00:00:00.000Z");
  });

  it("communique le motif du refus et le conserve", async () => {
    const calls = stubFetch((url) =>
      url === "/api/companies/c-pending/review"
        ? json({
            ...pendingCompany,
            status: "REJECTED",
            reviewNote: "Documents incomplets",
            reviewedAt: "2026-02-01T00:00:00.000Z",
          })
        : json({ message: "Route inattendue." }, 404),
    );

    await setCompanyStatus("c-pending", "REJECTED", "Documents incomplets");

    expect(calls[0]).toMatchObject({
      body: { status: "REJECTED", note: "Documents incomplets" },
    });
    expect(current().status).toBe("REJECTED");
    expect(current().reviewNote).toBe("Documents incomplets");
  });

  it("refuse une décision du backend sans modifier le cache", async () => {
    stubFetch(() => json({ message: "Cette action n'est pas autorisée pour votre compte." }, 403));

    await expect(setCompanyStatus("c-pending", "APPROVED")).rejects.toThrow(
      "Cette action n'est pas autorisée pour votre compte.",
    );
    expect(current().status).toBe("PENDING");
  });

  it("une entreprise refusée peut redemander la validation", async () => {
    const calls = stubFetch((url) =>
      url === "/api/companies/c-rejected/resubmit" ? noContent() : json({}, 404),
    );

    await resubmitCompany("c-rejected");

    expect(calls[0]).toMatchObject({
      url: "/api/companies/c-rejected/resubmit",
      method: "POST",
      credentials: "include",
    });
    const company = useDbStore.getState().companies.find((c) => c.id === "c-rejected")!;
    expect(company.status).toBe("PENDING");
    expect(company.submittedAt).toBeTruthy();
  });

  it("ne remet jamais une entreprise en attente depuis l'écran", async () => {
    const calls = stubFetch(() => noContent());

    await expect(setCompanyStatus("c-pending", "PENDING")).rejects.toThrow(
      "Une entreprise ne peut pas être remise en attente.",
    );
    expect(calls).toHaveLength(0);
  });
});

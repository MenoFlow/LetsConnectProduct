import { describe, expect, it } from "vitest";
import { can, permissionsFor } from "@/lib/permissions";
import {
  admin,
  client,
  editor,
  manager,
  members,
  owner,
  suspendedClient,
} from "@/test/fixtures";

const ownerMember = members.find((m) => m.userId === "u-1")!;
const managerMember = members.find((m) => m.userId === "u-10")!;
const editorMember = members.find((m) => m.userId === "u-11")!;

describe("permissions de l'entreprise", () => {
  it("le propriétaire gère tout, membres compris", () => {
    expect(can(owner, "company.members", ownerMember)).toBe(true);
    expect(can(owner, "company.statistics", ownerMember)).toBe(true);
    expect(can(owner, "company.profile", ownerMember)).toBe(true);
    expect(can(owner, "company.products.write", ownerMember)).toBe(true);
  });

  it("le manager ne gère pas les membres mais voit les statistiques", () => {
    expect(can(manager, "company.members", managerMember)).toBe(false);
    expect(can(manager, "company.statistics", managerMember)).toBe(true);
    expect(can(manager, "company.profile", managerMember)).toBe(true);
    expect(can(manager, "company.products.write", managerMember)).toBe(true);
  });

  it("l'éditeur ajoute et modifie des produits, sans membres ni statistiques", () => {
    expect(can(editor, "company.products.write", editorMember)).toBe(true);
    expect(can(editor, "company.catalogue", editorMember)).toBe(true);
    expect(can(editor, "company.messages", editorMember)).toBe(true);
    expect(can(editor, "company.members", editorMember)).toBe(false);
    expect(can(editor, "company.statistics", editorMember)).toBe(false);
    expect(can(editor, "company.profile", editorMember)).toBe(false);
  });

  it("les rôles internes ne donnent pas les permissions d'administration", () => {
    expect(permissionsFor(owner, ownerMember)).not.toContain("admin.users");
    expect(permissionsFor(manager, managerMember)).not.toContain("admin.companies");
    expect(permissionsFor(editor, editorMember)).not.toContain("admin.categories");
  });
});

describe("permissions des autres rôles", () => {
  it("le client utilise son espace, jamais celui de l'entreprise", () => {
    expect(can(client, "client.cart")).toBe(true);
    expect(can(client, "client.favorites")).toBe(true);
    expect(can(client, "client.messages")).toBe(true);
    expect(can(client, "company.dashboard")).toBe(false);
    expect(can(client, "admin.users")).toBe(false);
  });

  it("l'administrateur accède à toutes les interfaces administratives", () => {
    expect(can(admin, "admin.users")).toBe(true);
    expect(can(admin, "admin.companies")).toBe(true);
    expect(can(admin, "admin.products")).toBe(true);
    expect(can(admin, "admin.categories")).toBe(true);
    expect(can(admin, "admin.statistics")).toBe(true);
  });

  it("un compte suspendu n'a plus aucune permission", () => {
    expect(suspendedClient.isActive).toBe(false);
    expect(can(suspendedClient, "client.cart")).toBe(false);
    expect(can(suspendedClient, "client.messages")).toBe(false);
  });
});

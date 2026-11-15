import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/components/common";
import { SettingsPage } from "@/pages/public/SettingsPage";

export const Route = createFileRoute("/parametres")({
  head: () => pageHead("Paramètres", "Les préférences de votre espace MatérialConnect."),
  component: SettingsPage,
});

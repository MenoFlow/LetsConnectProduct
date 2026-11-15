import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/components/common";
import { PasswordPage } from "@/pages/public/PasswordPage";

export const Route = createFileRoute("/mot-de-passe-oublie")({
  head: () =>
    pageHead("Mot de passe oublié", "Demandez la récupération de votre compte MatérialConnect."),
  component: PasswordPage,
});

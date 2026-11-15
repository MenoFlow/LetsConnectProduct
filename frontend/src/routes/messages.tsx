import { createFileRoute, redirect } from "@tanstack/react-router";

// Les conversations s'ouvrent désormais dans l'espace du compte connecté :
// un compte entreprise est renvoyé vers sa messagerie par la garde de route.
export const Route = createFileRoute("/messages")({
  beforeLoad: () => {
    throw redirect({ to: "/client/messages" });
  },
  component: () => null,
});

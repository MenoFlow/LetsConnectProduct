import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/components/common";
import { HomePage } from "@/pages/public/HomePage";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead(
      "Fournisseurs de matières premières",
      "Trouvez des fournisseurs, découvrez leurs matières premières et préparez vos achats avec MatérialConnect.",
    ),
  component: HomePage,
});

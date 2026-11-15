import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/components/common";
import { FavoritesPage } from "@/pages/client/FavoritesPage";

export const Route = createFileRoute("/client/favoris")({
  head: () => pageHead("Mes favoris", "Les entreprises que vous avez mises de côté."),
  component: FavoritesPage,
});

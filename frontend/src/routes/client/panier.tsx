import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/components/common";
import { CartPage } from "@/pages/client/CartPage";

export const Route = createFileRoute("/client/panier")({
  head: () => pageHead("Mon panier estimatif", "Liste indicative des matières premières dont vous avez besoin."),
  component: CartPage,
});

import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/components/common";
import { ProductDetailPage } from "@/pages/public/CatalogPage";
import { getProduct } from "@/data/repository";

export const Route = createFileRoute("/produits/$id")({
  head: ({ params }) => {
    const product = getProduct(params.id);
    return pageHead(
      product ? product.name : "Produit indisponible",
      product
        ? `${product.description} Prix indicatif : ${product.unitPrice} Ar ${product.unit}.`
        : "Ce produit n’est pas publié au catalogue public.",
    );
  },
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  return <ProductDetailPage id={id} />;
}

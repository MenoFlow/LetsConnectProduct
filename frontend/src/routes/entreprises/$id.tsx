import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/components/common";
import { CompanyDetailPage } from "@/pages/public/CompaniesPage";
import { getCompany } from "@/data/repository";

export const Route = createFileRoute("/entreprises/$id")({
  head: ({ params }) => {
    const company = getCompany(params.id);
    return pageHead(
      company ? company.name : "Entreprise introuvable",
      company
        ? `${company.description} Adresse, horaires, coordonnées et produits de ${company.name} à ${company.city}.`
        : "Cette fiche d’entreprise n’existe pas.",
    );
  },
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  return <CompanyDetailPage id={id} />;
}

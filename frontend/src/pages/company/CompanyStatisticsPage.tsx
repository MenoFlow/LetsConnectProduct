import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  useActivity,
  useCategories,
  useCurrentCompany,
  useMyRole,
  useProducts,
} from "@/data/repository";
import {
  EmptyState,
  Field,
  SectionHeading,
} from "@/components/common";
import { AVAILABILITY_LABEL } from "@/types";
import type { ProductAvailability } from "@/types";

const availabilityValues: ProductAvailability[] = [
  "AVAILABLE",
  "ON_REQUEST",
  "UNAVAILABLE",
];

export function CompanyStatisticsPage() {
  const company = useCurrentCompany();
  const role = useMyRole();
  const products = useProducts();
  const categories = useCategories();
  const activity = useActivity();
  const [period, setPeriod] = useState(6);

  if (role === "EDITOR") {
    return (
      <main className="container page-main">
        <h1 className="page-title">Statistiques</h1>
        <p role="alert">Les statistiques ne sont pas accessibles à votre rôle</p>
      </main>
    );
  }

  if (!company) {
    return (
      <main className="container page-main">
        <EmptyState title="Aucune entreprise rattachée" />
      </main>
    );
  }

  if (!role) {
    return (
      <main className="container page-main">
        <p className="text-muted-foreground">Chargement des droits d’accès…</p>
      </main>
    );
  }

  const owned = products.filter((product) => product.companyId === company.id);
  const records = activity.filter((record) => record.companyId === company.id);
  const now = new Date();

  const evolution = Array.from({ length: period }, (_, index) => {
    const date = new Date(
      now.getFullYear(),
      now.getMonth() - period + 1 + index,
      1,
    );
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const rows = records.filter((record) => record.date.startsWith(key));
    return {
      month: date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      profileViews: rows.reduce((sum, row) => sum + row.profileViews, 0),
      productViews: rows.reduce((sum, row) => sum + row.productViews, 0),
    };
  });

  const categoryCounts = categories
    .map((category) => ({
      name: category.name,
      count: owned.filter((product) => product.categoryId === category.id).length,
    }))
    .filter((category) => category.count > 0);

  const unknownCount = owned.filter(
    (product) => !categories.some((category) => category.id === product.categoryId),
  ).length;

  if (unknownCount > 0) {
    categoryCounts.push({ name: "Catégorie inconnue", count: unknownCount });
  }

  const availability = availabilityValues.map((value) => ({
    id: value,
    name: AVAILABILITY_LABEL[value],
    count: owned.filter((product) => product.availability === value).length,
  }));

  const summary = [
    ["Total produits", owned.length],
    ["Publiés", owned.filter((product) => product.status === "PUBLISHED").length],
    ["Brouillons", owned.filter((product) => product.status === "DRAFT").length],
    ["Archivés", owned.filter((product) => product.status === "ARCHIVED").length],
    ["Disponibles", owned.filter((product) => product.availability === "AVAILABLE").length],
  ] as const;

  return (
    <main className="container page-main">
      <header className="page-head">
        <h1 className="page-title">Statistiques</h1>
        <Field label="Période">
          <select value={period} onChange={(event) => setPeriod(Number(event.target.value))}>
            <option value={3}>Trimestre</option>
            <option value={6}>Semestre</option>
            <option value={12}>Année</option>
          </select>
        </Field>
      </header>


      <section className="workspace-band">
        <SectionHeading title="Évolution des vues" />
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={evolution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="profileViews"
                name="Vues du profil"
                stroke="var(--primary)"
                fill="var(--primary)"
                fillOpacity={0.12}
              />
              <Area
                type="monotone"
                dataKey="productViews"
                name="Vues des produits"
                stroke="var(--highlight)"
                fill="var(--highlight)"
                fillOpacity={0.18}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="chart-legend">Vues du profil · Vues des produits</p>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="workspace-band min-w-0">
          <SectionHeading title="Produits par catégorie" subtitle="État actuel du catalogue" />
          {owned.length === 0 ? (
            <EmptyState compact title="Aucun produit à analyser" />
          ) : (
            <div className="chart-box">
              <ResponsiveContainer
                width="100%"
                height={Math.max(260, categoryCounts.length * 48)}
              >
                <BarChart data={categoryCounts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={130} />
                  <Tooltip />
                  <Bar dataKey="count" name="Produits" fill="var(--primary)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="workspace-band min-w-0">
          <SectionHeading
            title="Disponibilité du catalogue"
            subtitle="État actuel, tous statuts de publication"
          />
          {owned.length === 0 ? (
            <EmptyState compact title="Aucun produit à analyser" />
          ) : (
            <>
              <div className="pie-wrap">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={availability}
                      dataKey="count"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={95}
                    >
                      <Cell fill="var(--primary)" />
                      <Cell fill="var(--highlight)" />
                      <Cell fill="var(--primary)" fillOpacity={0.35} />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="chart-legend">
                {availability.map((item) => (
                  <li key={item.id}>{item.name} : {item.count}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <section className="workspace-band">
        <SectionHeading title="Récapitulatif du catalogue" />
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Indicateur</th>
              <th scope="col">Nombre</th>
            </tr>
          </thead>
          <tbody>
            {summary.map(([label, count]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

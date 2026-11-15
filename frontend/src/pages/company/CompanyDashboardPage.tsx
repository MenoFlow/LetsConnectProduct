import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  useCurrentUser,
  useMyMembership,
  useCurrentCompany,
  useProducts,
  useActivity,
  listActivity,
  useConversationsForCurrentUser,
  listMessagesOf,
} from "@/data/repository";
import {
  CompanyStatusBadge,
  EmptyState,
  Field,
  SectionHeading,
} from "@/components/common";
import { formatDate } from "@/lib/format";

export function CompanyDashboardPage() {
  const user = useCurrentUser();
  const membership = useMyMembership();
  const company = useCurrentCompany();
  const products = useProducts();
  const activity = useActivity();
  const conversations = useConversationsForCurrentUser();
  const [period, setPeriod] = useState(6);

  if (!company || !membership || !user) {
    return (
      <main className="container page-main">
        <EmptyState title="Aucune entreprise rattachée" />
      </main>
    );
  }

  // L'abonnement garantit la réactivité des lectures listActivity.
  void activity;

  const records = listActivity(company.id);
  const now = new Date();
  const monthly = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const rows = records.filter((record) => record.date.startsWith(key));
    return {
      date: key,
      month: date.toLocaleDateString("fr-FR", {
        month: "short",
        year: "2-digit",
      }),
      profileViews: rows.reduce((sum, row) => sum + row.profileViews, 0),
      productViews: rows.reduce((sum, row) => sum + row.productViews, 0),
      messages: rows.reduce((sum, row) => sum + row.messages, 0),
    };
  });

  const semester = monthly.slice(-6);
  const ownedProducts = products.filter((product) => product.companyId === company.id);
  const latest = conversations
    .filter((conversation) => conversation.companyId === company.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);

  const metrics = [
    {
      label: "Vues du profil",
      value: semester.reduce((sum, row) => sum + row.profileViews, 0),
    },
    {
      label: "Vues des produits",
      value: semester.reduce((sum, row) => sum + row.productViews, 0),
    },
    {
      label: "Messages reçus",
      value: semester.reduce((sum, row) => sum + row.messages, 0),
    },
    {
      label: "Produits publiés",
      value: `${ownedProducts.filter((product) => product.status === "PUBLISHED").length} / ${ownedProducts.length}`,
    },
  ];

  return (
    <main className="container page-main">
      <header className="page-head">
        <div>
          <h1 className="page-title">{company.name}</h1>
          <p className="page-subtitle">
            Bonjour {user.firstName}. Voici l’activité de votre entreprise.
          </p>
        </div>
        <CompanyStatusBadge status={company.status} />
      </header>

      <section className="kpi-grid" aria-label="Indicateurs de l’entreprise">
        {metrics.map((metric) => (
          <article className="kpi-card" key={metric.label}>
            <p className="kpi-label">{metric.label}</p>
            <strong className="text-2xl">{metric.value}</strong>
          </article>
        ))}
      </section>

      <section className="workspace-band">
        <SectionHeading
          title="Évolution des vues"
          action={
            <Field label="Période">
              <select value={period} onChange={(event) => setPeriod(Number(event.target.value))}>
                <option value={3}>Trimestre</option>
                <option value={6}>Semestre</option>
                <option value={12}>Année</option>
              </select>
            </Field>
          }
        />
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthly.slice(-period)}>
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

      <section className="workspace-band">
        <SectionHeading
          title="Dernières demandes"
          action={<Link className="text-link" to="/company/messages">Voir la messagerie</Link>}
        />
        {latest.length === 0 ? (
          <EmptyState compact title="Aucune demande reçue pour le moment" />
        ) : (
          <ul className="grid gap-3">
            {latest.map((conversation) => {
              const messages = listMessagesOf(conversation.id);
              const lastMessage = messages[messages.length - 1];
              return (
                <li key={conversation.id} className="rounded-md border border-border p-3">
                  <Link to="/company/messages" className="text-link">
                    {conversation.subject}
                  </Link>
                  <p className="truncate text-muted-foreground">
                    {lastMessage?.body ?? "Aucun message"}
                  </p>
                  <time dateTime={conversation.updatedAt}>
                    {formatDate(conversation.updatedAt)}
                  </time>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

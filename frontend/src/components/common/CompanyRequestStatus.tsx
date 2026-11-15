// Suivi de la demande d'inscription affiché en tête de l'espace entreprise.
import { useState } from "react";
import { CheckCircle2, Clock, PauseCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resubmitCompany } from "@/data/repository";
import { errorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Company } from "@/types";

const steps = ["Demande envoyée", "Examen par l’administrateur", "Entreprise publiée"];

export function CompanyRequestStatus({ company }: { company: Company }) {
  const [busy, setBusy] = useState(false);
  if (company.status === "APPROVED" && company.reviewedAt === undefined) return null;
  const reached = company.status === "APPROVED" ? 3 : company.status === "PENDING" ? 2 : 2;

  const content = {
    PENDING: {
      icon: Clock,
      tone: "border-border bg-muted",
      title: "Demande en attente de validation",
      text: "Un administrateur examine votre entreprise. Vous pouvez déjà compléter votre profil et préparer vos produits : ils seront visibles dès l’approbation.",
    },
    APPROVED: {
      icon: CheckCircle2,
      tone: "border-primary/40 bg-primary/10",
      title: "Entreprise validée",
      text: "Votre entreprise et vos produits publiés sont maintenant visibles par les clients.",
    },
    REJECTED: {
      icon: XCircle,
      tone: "border-destructive/40 bg-destructive/10",
      title: "Demande refusée",
      text: "Corrigez les informations de votre entreprise puis soumettez à nouveau votre demande.",
    },
    SUSPENDED: {
      icon: PauseCircle,
      tone: "border-destructive/40 bg-destructive/10",
      title: "Entreprise suspendue",
      text: "Votre entreprise et vos produits ne sont plus visibles. Contactez l’administration pour la réactivation.",
    },
  }[company.status];
  const Icon = content.icon;

  return (
    <section
      role="status"
      aria-label="Statut de la demande"
      className={`container mt-4 rounded-lg border p-4 ${content.tone}`}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="flex-1 space-y-2">
          <strong className="block">{content.title}</strong>
          <p className="text-sm">{content.text}</p>
          {company.reviewNote && (company.status === "REJECTED" || company.status === "SUSPENDED") && (
            <p className="text-sm">
              <strong>Motif :</strong> {company.reviewNote}
            </p>
          )}
          {company.status !== "SUSPENDED" && (
            <ol className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {steps.map((step, index) => {
                const failed = company.status === "REJECTED" && index === 1;
                const done = index < reached - (company.status === "PENDING" ? 1 : 0) || company.status === "APPROVED";
                return (
                  <li key={step} className={done ? "font-semibold text-foreground" : ""}>
                    {failed ? "✕" : done ? "✓" : `${index + 1}.`} {failed ? "Refusée" : step}
                  </li>
                );
              })}
            </ol>
          )}
          <p className="text-xs text-muted-foreground">
            Envoyée le {formatDate(company.submittedAt ?? company.createdAt)}
            {company.reviewedAt ? ` · décision le ${formatDate(company.reviewedAt)}` : ""}
          </p>
          {company.status === "REJECTED" && (
            <Button
              size="sm"
              disabled={busy}
              onClick={async () => {
                if (busy) return;
                setBusy(true);
                try {
                  await resubmitCompany(company.id);
                  toast.success("Demande soumise à nouveau", {
                    description: "Un administrateur va réexaminer votre entreprise.",
                  });
                } catch (cause) {
                  toast.error(errorMessage(cause));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Envoi en cours…" : "Soumettre à nouveau"}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

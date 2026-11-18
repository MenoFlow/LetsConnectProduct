// Décision de modération d'une entreprise, partagée par le tableau de bord et
// l'écran Entreprises : validation directe, ou refus/suspension avec motif
// obligatoire communiqué à l'entreprise.
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmAction } from "@/components/common/AdminUI";
import { Field } from "@/components/common";
import { setCompanyStatus } from "@/data/repository";
import { errorMessage } from "@/lib/api";
import type { Company, CompanyStatus } from "@/types";

function outcome(company: Company, next: CompanyStatus): string {
  if (next === "APPROVED") return `${company.name} est validée et visible publiquement.`;
  if (next === "REJECTED")
    return `La demande de ${company.name} est refusée. L’entreprise verra le motif.`;
  if (next === "SUSPENDED") return `${company.name} est suspendue et masquée du catalogue.`;
  return `${company.name} est remise en attente.`;
}

export function useCompanyDecision() {
  const [request, setRequest] = useState<{
    company: Company;
    next: CompanyStatus;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  // La décision est enregistrée côté serveur : on n'affiche la confirmation
  // qu'après la réponse, et le motif de refus est communiqué à l'entreprise.
  async function decide(
    company: Company,
    next: CompanyStatus,
    note?: string,
  ): Promise<boolean> {
    if (busy) return false;
    setBusy(true);
    try {
      await setCompanyStatus(company.id, next, note);
      toast.success(outcome(company, next));
      return true;
    } catch (cause) {
      toast.error(errorMessage(cause));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const askReason = (company: Company, next: CompanyStatus) => {
    setReason("");
    setRequest({ company, next });
  };

  const dialog = (
    <ConfirmAction
      open={Boolean(request)}
      title={`${request?.next === "REJECTED" ? "Refuser" : "Suspendre"} ${request?.company.name ?? ""}`}
      description="Le motif sera communiqué à l’entreprise. Son catalogue ne sera plus visible publiquement."
      busy={busy}
      label={request?.next === "REJECTED" ? "Refuser la demande" : "Suspendre"}
      confirmDisabled={!reason.trim()}
      onClose={() => setRequest(null)}
      onConfirm={() => {
        if (!request || !reason.trim()) return;
        void decide(request.company, request.next, reason.trim()).then((saved) => {
          if (saved) setRequest(null);
        });
      }}
    >
      <Field label="Motif communiqué à l’entreprise">
        <textarea
          required
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Précisez le motif de votre décision"
        />
      </Field>
      {!reason.trim() && (
        <p className="form-help">Un motif est obligatoire pour confirmer.</p>
      )}
    </ConfirmAction>
  );

  return { decide, askReason, dialog, busy };
}

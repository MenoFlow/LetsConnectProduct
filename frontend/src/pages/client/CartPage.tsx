import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { EmptyState, Field, SectionHeading } from "@/components/common";
import {
  useCurrentUser,
  useCart,
  useCompanies,
  useProducts,
  cartLines,
  cartLinesByCompany,
  cartItemCount,
  cartTotal,
  setCartItemQuantity,
  removeCartItem,
  clearCart,
  startConversation,
  useCartError,
} from "@/data/repository";
import { errorMessage } from "@/lib/api";
import { formatPrice, pluralize } from "@/lib/format";

export function CartPage() {
  const user = useCurrentUser();
  const cart = useCart();
  const companies = useCompanies();
  useProducts();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const cartError = useCartError();

  if (!user) return null;

  // Une modification du panier n'affiche pas d'écran de chargement : elle
  // signale simplement son échec, le serveur renvoyant le panier recalculé.
  const run = (action: () => Promise<unknown>) => {
    void action().catch((cause) => setError(errorMessage(cause)));
  };

  const lines = cartLines(cart);
  const groups = cartLinesByCompany(lines);
  const contactName = name ?? `${user.firstName} ${user.lastName}`;
  const contactEmail = email ?? user.email;
  const missingCompany = groups.some(
    (group) => !companies.some((company) => company.id === group.companyId),
  );

  async function contactSuppliers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || submitting || groups.length === 0) return;

    if (missingCompany) {
      setError("Un fournisseur est indisponible. Retirez ses produits du panier.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      for (const group of groups) {
        const detail = group.lines.map(
          (line) =>
            `- ${line.quantity} ${line.product.unit} de ${line.product.name} : ${formatPrice(line.lineTotal)}`,
        ).join("\n");

        await startConversation({
          companyId: group.companyId,
          clientId: user.id,
          subject: "Demande de prix — panier MatérialConnect",
          body: [
            `Bonjour,\n\nJe souhaite obtenir un devis pour :\n${detail}`,
            `Total indicatif : ${formatPrice(cartTotal(group.lines))}`,
            `Contact : ${contactName.trim()} — ${contactEmail.trim()}`,
            message.trim(),
            "Cette demande est indicative et ne constitue pas une commande.",
          ].filter(Boolean).join("\n\n"),
        });
      }

      // La demande est partie : le panier est vidé pour éviter un second envoi.
      await clearCart(user.id);
      setConfirmation(
        `Votre demande a été envoyée à ${pluralize(groups.length, "fournisseur", "fournisseurs")}. Retrouvez les échanges dans votre messagerie.`,
      );
      setOpen(false);
      setMessage("");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container page-main">
      <header className="page-head">
        <div>
          <h1 className="page-title">Mon panier estimatif</h1>
          <p className="page-subtitle">
            Une liste indicative : aucune commande ni aucun paiement.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={lines.length === 0}
          onClick={() => {
            run(() => clearCart(user.id));
            setConfirmation("");
          }}
        >
          Vider le panier
        </Button>
      </header>

      {confirmation && <p role="status">{confirmation}</p>}
      {(error || cartError) && (
        <p className="form-error" role="alert">
          {error || cartError}
        </p>
      )}

      {lines.length === 0 ? (
        <EmptyState
          title="Votre panier est vide"
          description="Explorez le catalogue pour préparer votre sélection."
        >
          <Button asChild>
            <Link to="/produits">Explorer les produits</Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0">
            {groups.map((group) => {
              const company = companies.find(
                (item) => item.id === group.companyId,
              );

              return (
                <section className="workspace-band" key={group.companyId}>
                  <SectionHeading
                    title={company?.name ?? "Fournisseur indisponible"}
                  />
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th scope="col">Produit / Fournisseur</th>
                          <th scope="col">Prix unitaire</th>
                          <th scope="col">Quantité</th>
                          <th scope="col">Sous-total</th>
                          <th scope="col">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.lines.map((line) => {
                          const updateQuantity = (value: number) => {
                            if (Number.isFinite(value) && value >= 1) {
                              run(() => setCartItemQuantity(user.id, line.id, value));
                            }
                          };

                          return (
                            <tr key={line.id}>
                              <td>
                                <strong>{line.product.name}</strong>
                                <p className="text-muted-foreground">
                                  {company?.name ?? "Fournisseur indisponible"}
                                </p>
                                {line.priceRevised && (
                                  <p className="form-help">
                                    Prix révisé depuis l'ajout (prix initial :{" "}
                                    {formatPrice(line.unitPriceSnapshot)})
                                  </p>
                                )}
                              </td>
                              <td>
                                {formatPrice(line.product.unitPrice)}
                                <small> / {line.product.unit}</small>
                              </td>
                              <td>
                                <div className="quantity-control">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Diminuer la quantité de ${line.product.name}`}
                                    disabled={line.quantity <= 1}
                                    onClick={() => updateQuantity(line.quantity - 1)}
                                  >
                                    −
                                  </Button>
                                  <input
                                    type="number"
                                    min={1}
                                    step="any"
                                    aria-label={`Quantité de ${line.product.name}`}
                                    value={line.quantity}
                                    onChange={(event) =>
                                      updateQuantity(event.currentTarget.valueAsNumber)
                                    }
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Augmenter la quantité de ${line.product.name}`}
                                    onClick={() => updateQuantity(line.quantity + 1)}
                                  >
                                    +
                                  </Button>
                                </div>
                              </td>
                              <td>{formatPrice(line.lineTotal)}</td>
                              <td>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  aria-label={`Retirer ${line.product.name}`}
                                  onClick={() => run(() => removeCartItem(user.id, line.id))}
                                >
                                  Retirer
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-3">
                    Sous-total fournisseur :{" "}
                    <strong>{formatPrice(cartTotal(group.lines))}</strong>
                  </p>
                </section>
              );
            })}
          </div>

          <aside className="workspace-band self-start">
            <SectionHeading title="Récapitulatif estimatif" />
            <dl className="info-list">
              <div>
                <dt>Articles</dt>
                <dd>{cartItemCount(lines)}</dd>
              </div>
              <div>
                <dt>Fournisseurs</dt>
                <dd>{groups.length}</dd>
              </div>
              <div>
                <dt>Total estimatif</dt>
                <dd><strong>{formatPrice(cartTotal(lines))}</strong></dd>
              </div>
            </dl>
            <p className="legal-note mt-3">
              Les prix sont indicatifs et restent à confirmer auprès des
              fournisseurs, ainsi que les disponibilités et frais éventuels.
              Ce panier ne constitue ni une commande ni un paiement.
            </p>
            <Button
              className="w-full mt-3"
              onClick={() => {
                setError("");
                setOpen(true);
              }}
            >
              Contacter les fournisseurs
            </Button>
          </aside>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contacter les fournisseurs</DialogTitle>
            <DialogDescription>
              Une conversation sera créée avec chaque fournisseur.
              Aucun achat ne sera effectué.
            </DialogDescription>
          </DialogHeader>
          <ul className="info-list">
            {groups.map((group) => (
              <li key={group.companyId}>
                {companies.find((company) => company.id === group.companyId)?.name
                  ?? "Fournisseur indisponible"}
              </li>
            ))}
          </ul>
          <form className="form-grid" onSubmit={contactSuppliers}>
            <Field label="Nom">
              <input
                required
                value={contactName}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
              />
            </Field>
            <Field label="Email">
              <input
                required
                type="email"
                value={contactEmail}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </Field>
            <div className="form-full">
              <Field label="Message facultatif">
                <textarea
                  rows={4}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </Field>
            </div>
            {error && <p className="form-error form-full" role="alert">{error}</p>}
            <div className="form-actions form-full">
              <Button
                type="submit"
                disabled={
                  submitting || groups.length === 0 ||
                  !contactName.trim() || !contactEmail.trim()
                }
              >
                {submitting ? "Envoi en cours…" : "Envoyer les demandes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}

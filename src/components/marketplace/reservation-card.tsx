import { ReservationDecisionForm } from "@/components/forms/reservation-forms";
import {
  formatPeriod,
  reservationStatus,
  reservationLabels,
} from "@/features/reservations/validation";
export type ReservationRow = {
  id: string;
  listing_title: string;
  customer_name: string;
  quantity: number;
  total_minor: number;
  starts_at: string;
  ends_at: string;
  expires_at: string;
  status: string;
  customer_note: string;
  decision_note: string | null;
  created_at: string;
};
export function ReservationCard({
  item,
  manager = false,
}: {
  item: ReservationRow;
  manager?: boolean;
}) {
  const status = reservationStatus(item.status, item.expires_at);
  const future = new Date(item.starts_at).getTime() > Date.now();
  const ended = new Date(item.ends_at).getTime() <= Date.now();
  const choices = manager
    ? status === "pending" && future
      ? ["confirmed", "rejected"]
      : status === "confirmed"
        ? future
          ? ["cancelled"]
          : ended
            ? ["completed"]
            : []
        : []
    : future && ["pending", "confirmed"].includes(status)
      ? ["cancelled"]
      : [];
  return (
    <article>
      <span className="status-badge">
        {reservationLabels[status] ?? status}
      </span>
      <h2>{item.listing_title}</h2>
      <p>Referência: {item.id.slice(0, 8).toUpperCase()}</p>
      {manager && <p>Cliente: {item.customer_name}</p>}
      <p>
        {formatPeriod(item.starts_at)} → {formatPeriod(item.ends_at)}
      </p>
      <p>
        {item.quantity} {item.quantity === 1 ? "unidade" : "unidades"} ·{" "}
        {(item.total_minor / 100).toLocaleString("pt-MZ")} MZN
      </p>
      <p className="notice">
        Sem cobrança online. Uma reserva confirmada não é um comprovativo de
        pagamento.
      </p>
      {status === "pending" && (
        <p>Resposta do parceiro até {formatPeriod(item.expires_at)}.</p>
      )}
      {item.customer_note && <p>Nota do cliente: {item.customer_note}</p>}
      {item.decision_note && <p>Última decisão: {item.decision_note}</p>}
      {choices.length > 0 && (
        <ReservationDecisionForm
          key={`${item.id}:${status}`}
          id={item.id}
          choices={choices}
        />
      )}
    </article>
  );
}

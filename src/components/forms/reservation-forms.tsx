"use client";
import { useActionState, useState } from "react";
import { CalendarPlus, Send, LoaderCircle, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  closeSlot,
  createSlot,
  requestBooking,
  decideBooking,
} from "@/features/reservations/actions";
import {
  formatPeriod,
  reservationLabels,
} from "@/features/reservations/validation";
export type AvailablePeriod = {
  id: string;
  starts_at: string;
  ends_at: string;
  price_minor: number;
  remaining: number;
};
export function AvailabilityForm({
  listings,
}: {
  listings: { id: string; title: string }[];
}) {
  const [state, action, pending] = useActionState(createSlot, {});
  return (
    <form action={action} className="account-form">
      <label>
        Oferta
        <select name="listingId" required>
          <option value="">Selecciona a oferta</option>
          {listings.map((l) => (
            <option value={l.id} key={l.id}>
              {l.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        Início · horário de Moçambique
        <input type="datetime-local" name="startsAt" required />
      </label>
      <label>
        Fim · horário de Moçambique
        <input type="datetime-local" name="endsAt" required />
      </label>
      <label>
        Unidades disponíveis
        <input type="number" name="capacity" min={1} max={10000} required />
      </label>
      <label>
        Preço por unidade para todo o período (MZN)
        <input
          name="price"
          inputMode="decimal"
          pattern="[0-9]{1,7}([.,][0-9]{1,2})?"
          required
        />
      </label>
      <p className="notice">
        Cria períodos fechados, sem sobreposição na mesma oferta. Define na
        descrição se uma unidade corresponde a uma pessoa, quarto, mesa ou
        grupo. O preço cobre o período completo.
      </p>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="form-success" role="status">
          {state.success}
        </p>
      )}
      <Button disabled={pending}>
        {pending ? (
          <LoaderCircle className="animate-spin" size={18} />
        ) : (
          <CalendarPlus size={18} />
        )}
        Criar disponibilidade
      </Button>
    </form>
  );
}
export function ReservationRequestForm({
  periods,
  requestKey,
}: {
  periods: AvailablePeriod[];
  requestKey: string;
}) {
  const [state, action, pending] = useActionState(requestBooking, {});
  const [selected, setSelected] = useState(
    periods.find((p) => p.remaining > 0)?.id ?? "",
  );
  const [quantity, setQuantity] = useState(1);
  const period = periods.find((p) => p.id === selected);
  return (
    <form action={action} className="account-form">
      <input type="hidden" name="requestKey" value={requestKey} />
      <label>
        Período
        <select
          name="slotId"
          required
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            setQuantity(1);
          }}
        >
          <option value="">Selecciona</option>
          {periods.map((p) => (
            <option key={p.id} value={p.id} disabled={p.remaining < 1}>
              {formatPeriod(p.starts_at)} — {formatPeriod(p.ends_at)} ·{" "}
              {p.remaining} vagas
            </option>
          ))}
        </select>
      </label>
      <label>
        Quantidade de unidades
        <input
          name="quantity"
          type="number"
          min={1}
          max={Math.min(20, period?.remaining ?? 20)}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          required
        />
      </label>
      {period && (
        <p>
          <strong>
            Total previsto:{" "}
            {((period.price_minor * quantity) / 100).toLocaleString("pt-MZ")}{" "}
            MZN
          </strong>
          <br />
          Para o período completo. Não é cobrado nesta etapa.
        </p>
      )}
      <label>
        Nota ao parceiro (opcional)
        <textarea name="note" maxLength={1000} rows={3} />
      </label>
      <p className="notice">
        O parceiro precisa de confirmar. As vagas ficam mantidas até 24 horas ou
        até ao início do período, se for antes. Consulta a resposta em “As
        minhas reservas”. Cancelamento disponível antes do início; ainda não há
        pagamento online.
      </p>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <Button disabled={pending || !period || period.remaining < 1}>
        {pending ? (
          <LoaderCircle className="animate-spin" size={18} />
        ) : (
          <Send size={18} />
        )}
        Pedir reserva
      </Button>
    </form>
  );
}
export function ReservationDecisionForm({
  id,
  choices,
}: {
  id: string;
  choices: string[];
}) {
  const [state, action, pending] = useActionState(decideBooking, {});
  return (
    <form action={action} className="account-form">
      <input type="hidden" name="reservationId" value={id} />
      <label>
        Acção
        <select name="decision" required>
          <option value="">Selecciona</option>
          {choices.map((c) => (
            <option key={c} value={c}>
              {c === "confirmed"
                ? "Confirmar reserva"
                : c === "rejected"
                  ? "Recusar pedido"
                  : c === "cancelled"
                    ? "Cancelar reserva"
                    : reservationLabels[c]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Justificação (visível ao cliente e parceiro)
        <textarea
          name="reason"
          minLength={3}
          maxLength={1000}
          rows={2}
          required
        />
      </label>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="form-success" role="status">
          {state.success}
        </p>
      )}
      <Button variant="outline" disabled={pending}>
        {pending ? (
          <LoaderCircle className="animate-spin" size={18} />
        ) : (
          <ClipboardCheck size={18} />
        )}
        Actualizar reserva
      </Button>
    </form>
  );
}
export function ClosePeriodForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(closeSlot, {});
  return (
    <form action={action}>
      <input type="hidden" name="slotId" value={id} />
      <Button variant="outline" disabled={pending}>
        {pending ? (
          <LoaderCircle size={18} className="animate-spin" />
        ) : (
          <CalendarPlus size={18} />
        )}
        Fechar para novos pedidos
      </Button>
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="form-success">
          {state.success}
        </p>
      )}
    </form>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Search, Send, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
export function StayInventoryForm({
  listings,
}: {
  listings: { id: string; title: string }[];
}) {
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <form
      className="account-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setPending(true);
        setMessage("");
        try {
          const amount = Number(String(f.get("price")).replace(",", "."));
          const { error } = await createClient().rpc("set_stay_inventory", {
            target_listing: f.get("listing"),
            first_night: f.get("first"),
            last_night: f.get("last"),
            unit_capacity: Number(f.get("capacity")),
            nightly_price: Math.round(amount * 100),
            weekly: Number(f.get("weekly")),
            monthly: Number(f.get("monthly")),
          });
          setMessage(
            error
              ? "Não foi possível guardar. Confirma as datas e mantém capacidade suficiente para as reservas existentes."
              : "Inventário por noite actualizado.",
          );
          router.refresh();
        } catch {
          setMessage("Falha de ligação. Tenta novamente.");
        } finally {
          setPending(false);
        }
      }}
    >
      <label>
        Alojamento
        <select name="listing" required>
          {listings.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        Primeira noite
        <input type="date" name="first" required />
      </label>
      <label>
        Última noite incluída
        <input type="date" name="last" required />
      </label>
      <label>
        Unidades por noite · 0 fecha vendas
        <input type="number" name="capacity" min={0} max={10000} required />
      </label>
      <label>
        Preço por unidade e noite (MZN)
        <input
          name="price"
          type="number"
          min={0}
          max={1000000}
          step="0.01"
          required
        />
      </label>
      <label>
        Desconto a partir de 7 noites (%)
        <input
          type="number"
          name="weekly"
          min={0}
          max={90}
          defaultValue={0}
          required
        />
      </label>
      <label>
        Desconto a partir de 28 noites (%)
        <input
          type="number"
          name="monthly"
          min={0}
          max={90}
          defaultValue={0}
          required
        />
      </label>
      <p>
        As datas indicadas recebem o mesmo preço e capacidade. Os descontos
        aplicam-se a todo o alojamento; reservas existentes mantêm o preço
        acordado. Fecha os períodos antigos antes de receber pedidos por noite.
      </p>
      <Button disabled={pending}>
        {pending ? (
          <LoaderCircle className="animate-spin" size={18} />
        ) : (
          <CalendarDays size={18} />
        )}
        Guardar noites e preços
      </Button>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
    </form>
  );
}
type Quote = {
  nights: number;
  remaining: number;
  unit_total: number;
  discount: number;
};
export function StayRequestForm({
  id,
  requestKey,
}: {
  id: string;
  requestKey: string;
}) {
  const [arrival, setArrival] = useState(""),
    [departure, setDeparture] = useState(""),
    [units, setUnits] = useState(1),
    [quote, setQuote] = useState<Quote | null>(null),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <form
      className="account-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const submit = (e.nativeEvent as SubmitEvent).submitter?.getAttribute(
          "value",
        );
        setPending(true);
        setMessage("");
        try {
          const db = createClient();
          if (submit === "request" && quote) {
            const { error } = await db.rpc("request_stay", {
              target_listing: id,
              arrival,
              departure,
              units,
              note: String(f.get("note") ?? ""),
              idempotency_key: requestKey,
              expected_total: Number(quote.unit_total) * units,
            });
            if (error) {
              setQuote(null);
              setMessage(
                "O preço ou a disponibilidade podem ter mudado. Consulta novamente; confirma também que tens menos de 5 pedidos pendentes.",
              );
            } else {
              router.push("/reservas?enviado=1");
              router.refresh();
            }
          } else {
            const { data, error } = await db.rpc("quote_stay", {
              target_listing: id,
              arrival,
              departure,
            });
            if (error || !data?.length) {
              setQuote(null);
              setMessage(
                "Não existe disponibilidade para todas as noites seleccionadas.",
              );
            } else setQuote(data[0]);
          }
        } catch {
          setMessage("Falha de ligação. Tenta novamente.");
        } finally {
          setPending(false);
        }
      }}
    >
      <label>
        Entrada · a partir das 14h
        <input
          type="date"
          required
          value={arrival}
          disabled={pending}
          onChange={(e) => {
            setArrival(e.target.value);
            setQuote(null);
          }}
        />
      </label>
      <label>
        Saída · até às 10h
        <input
          type="date"
          required
          value={departure}
          disabled={pending}
          onChange={(e) => {
            setDeparture(e.target.value);
            setQuote(null);
          }}
        />
      </label>
      <label>
        Unidades
        <input
          type="number"
          min={1}
          max={20}
          required
          value={units}
          disabled={pending}
          onChange={(e) => {
            setUnits(Number(e.target.value));
            setQuote(null);
          }}
        />
      </label>
      <label>
        Nota ao parceiro
        <textarea name="note" maxLength={1000} />
      </label>
      <Button value="quote" disabled={pending}>
        <Search size={18} />
        Consultar preço e vagas
      </Button>
      {quote && (
        <>
          <p className="notice">
            {quote.nights} noites · {quote.remaining} unidades disponíveis ·
            desconto de {quote.discount}%<br />
            <strong>
              Total:{" "}
              {((Number(quote.unit_total) * units) / 100).toLocaleString(
                "pt-MZ",
              )}{" "}
              MZN
            </strong>
          </p>
          <Button value="request" disabled={pending || quote.remaining < units}>
            {pending ? (
              <LoaderCircle className="animate-spin" size={18} />
            ) : (
              <Send size={18} />
            )}
            Pedir reserva
          </Button>
        </>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
    </form>
  );
}

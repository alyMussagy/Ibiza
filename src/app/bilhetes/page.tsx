import Image from "next/image";
import QRCode from "qrcode";
import { Ticket } from "lucide-react";
import { requireUser } from "@/features/auth/session";
export const metadata = { title: "Os meus bilhetes" };
export default async function Tickets() {
  const { supabase } = await requireUser("/bilhetes");
  const { data, error } = await supabase
    .from("tickets")
    .select(
      "id,token,ordinal,checked_in_at,reservations!inner(listing_title,status,starts_at,ends_at)",
    )
    .limit(100);
  if (error) throw new Error("Não foi possível carregar os bilhetes.");
  return (
    <main id="main" className="shell category-page">
      <span className="eyebrow coral">IBIZA EVENTS</span>
      <h1>Os teus bilhetes.</h1>
      <p className="lead">
        Apresenta o QR na entrada. Cada código permite uma única entrada e deve
        ser mantido privado.
      </p>
      <div className="info-grid">
        {await Promise.all(
          (data ?? []).map(async (t) => {
            const r = Array.isArray(t.reservations)
              ? t.reservations[0]
              : t.reservations;
            const valid =
              r.status === "confirmed" &&
              !t.checked_in_at &&
              new Date(r.ends_at) > new Date();
            return (
              <article key={t.id}>
                <Ticket size={24} />
                <h2>{r.listing_title}</h2>
                <p>
                  Bilhete {t.ordinal} ·{" "}
                  {t.checked_in_at
                    ? "Entrada registada"
                    : valid
                      ? "Válido"
                      : "Inactivo"}
                </p>
                <p>
                  {new Intl.DateTimeFormat("pt-MZ", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Africa/Maputo",
                  }).format(new Date(r.starts_at))}
                </p>
                {valid && (
                  <Image
                    src={await QRCode.toDataURL("IBIZA:" + t.token, {
                      width: 280,
                      margin: 4,
                      errorCorrectionLevel: "M",
                    })}
                    alt={"QR de entrada do bilhete " + t.ordinal}
                    width={280}
                    height={280}
                    unoptimized
                  />
                )}
              </article>
            );
          }),
        )}
      </div>
      {!data?.length && (
        <div className="empty-state">
          <Ticket size={32} />
          <h2>Ainda não tens bilhetes.</h2>
          <p>
            Os bilhetes gratuitos aparecem após a confirmação da reserva.
            Bilhetes pagos dependem da activação dos pagamentos.
          </p>
        </div>
      )}
    </main>
  );
}
export const dynamic = "force-dynamic";

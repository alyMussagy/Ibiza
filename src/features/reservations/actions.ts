"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/features/auth/session";
import type { FormState } from "@/features/auth/actions";
import {
  slotSchema,
  requestSchema,
  decisionSchema,
  maputoDate,
} from "./validation";
function refresh() {
  revalidatePath("/reservas");
  revalidatePath("/business/reservas");
  revalidatePath("/business/disponibilidade");
  revalidatePath("/ofertas", "layout");
}
export async function createSlot(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser("/business/disponibilidade");
  const p = slotSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: "Revê as datas, a capacidade e o preço." };
  const start = maputoDate(p.data.startsAt),
    end = maputoDate(p.data.endsAt);
  if (!start || !end || start >= end)
    return {
      error: "Indica um intervalo de datas válido, no horário de Moçambique.",
    };
  const { error } = await supabase.rpc("create_availability", {
    target_listing: p.data.listingId,
    period_start: start,
    period_end: end,
    unit_capacity: p.data.capacity,
    unit_price: p.data.price,
  });
  if (error)
    return {
      error:
        "Não foi possível criar o período. Verifica a aprovação do negócio, datas futuras e se já existe um período sobreposto.",
    };
  refresh();
  return {
    success:
      "Período criado. Fica disponível quando o anúncio estiver publicado.",
  };
}
export async function requestBooking(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser("/reservas");
  const p = requestSchema.safeParse(Object.fromEntries(form));
  if (!p.success)
    return { error: "Revê o período e a quantidade (1 a 20 unidades)." };
  const { error } = await supabase.rpc("request_reservation", {
    target_slot: p.data.slotId,
    units: p.data.quantity,
    note: p.data.note,
    idempotency_key: p.data.requestKey,
  });
  if (error)
    return {
      error:
        "Não foi possível enviar. As vagas podem ter mudado, já podes ter um pedido para este período ou ter atingido 5 pedidos pendentes. Não é permitido reservar o próprio negócio.",
    };
  refresh();
  redirect("/reservas?enviado=1");
}
export async function decideBooking(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser("/reservas");
  const p = decisionSchema.safeParse(Object.fromEntries(form));
  if (!p.success)
    return {
      error: "Indica a decisão e uma justificação de pelo menos 3 caracteres.",
    };
  const { error } = await supabase.rpc("decide_reservation", {
    target_reservation: p.data.reservationId,
    decision: p.data.decision,
    reason: p.data.reason,
  });
  if (error)
    return {
      error:
        "Não foi possível alterar a reserva. O pedido pode ter expirado, mudado de estado ou estar fora do prazo permitido.",
    };
  refresh();
  return { success: "Estado da reserva actualizado." };
}
export async function closeSlot(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser("/business/disponibilidade");
  const id = form.get("slotId");
  if (
    typeof id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    return { error: "Período inválido." };
  const { error } = await supabase.rpc("close_availability", {
    target_slot: id,
  });
  if (error) return { error: "Não foi possível fechar o período." };
  refresh();
  return {
    success:
      "Período fechado para novos pedidos. As reservas existentes mantêm-se.",
  };
}

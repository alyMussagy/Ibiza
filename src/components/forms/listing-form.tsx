"use client";
import { useActionState } from "react";
import { Save, Send, LoaderCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveListing, reviewListing } from "@/features/listings/actions";
export type EditableListing = {
  id: string;
  organization_id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  price_minor: number;
  price_unit: string;
  revision: number;
};
export function ListingForm({
  organizations,
  item,
}: {
  organizations: { id: string; name: string }[];
  item?: EditableListing;
}) {
  const [state, action, pending] = useActionState(saveListing, {});
  return (
    <form action={action} className="account-form">
      <input type="hidden" name="id" value={item?.id ?? ""} />
      <input type="hidden" name="revision" value={item?.revision ?? 1} />
      <label>
        Negócio
        <select
          name="organizationId"
          defaultValue={item?.organization_id}
          required
        >
          {organizations
            .filter((o) => !item || o.id === item.organization_id)
            .map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
        </select>
      </label>
      <label>
        Título
        <input
          name="title"
          defaultValue={item?.title}
          minLength={5}
          maxLength={120}
          required
          placeholder="Ex.: Passeio de dhow na baía"
        />
      </label>
      <label>
        Categoria
        <select name="category" defaultValue={item?.category ?? "experiencias"}>
          <option value="estadias">Alojamento</option>
          <option value="experiencias">Experiência</option>
          <option value="restaurantes">Restaurante</option>
          <option value="eventos">Evento</option>
          <option value="destinos">Destino</option>
        </select>
      </label>
      <label>
        Localização
        <input
          name="location"
          defaultValue={item?.location}
          minLength={2}
          maxLength={120}
          required
          placeholder="Ex.: Tofo, Inhambane"
        />
      </label>
      <label>
        Descrição
        <textarea
          name="description"
          defaultValue={item?.description}
          minLength={30}
          maxLength={5000}
          rows={6}
          required
          placeholder="Descreve o serviço, o que está incluído e as condições."
        />
      </label>
      <label>
        Preço de referência (MZN)
        <input
          name="price"
          defaultValue={item ? String(item.price_minor / 100) : ""}
          inputMode="decimal"
          required
          placeholder="1500,00"
          pattern="[0-9]{1,7}([.,][0-9]{1,2})?"
        />
      </label>
      <label>
        Preço por
        <select name="unit" defaultValue={item?.price_unit ?? "pessoa"}>
          {["pessoa", "noite", "entrada", "mesa", "grupo"].map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </label>
      <p className="notice">
        Ao editar um anúncio publicado, este sai do catálogo até nova aprovação.
        O preço é informativo; a compra ainda não está disponível.
      </p>
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      <div className="account-links">
        <Button
          name="intent"
          value="draft"
          variant="outline"
          disabled={pending}
        >
          {pending ? (
            <LoaderCircle className="animate-spin" size={18} />
          ) : (
            <Save size={18} />
          )}
          Guardar rascunho
        </Button>
        <Button name="intent" value="submit" disabled={pending}>
          <Send size={18} />
          Enviar para análise
        </Button>
      </div>
    </form>
  );
}
export function ListingReviewForm({
  id,
  revision,
}: {
  id: string;
  revision: number;
}) {
  const [state, action, pending] = useActionState(reviewListing, {});
  return (
    <form action={action} className="account-form">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="revision" value={revision} />
      <label>
        Decisão
        <select required name="decision">
          <option value="">Selecciona</option>
          <option value="approved">Aprovar e publicar</option>
          <option value="rejected">Pedir ajustes</option>
        </select>
      </label>
      <label>
        Justificação
        <textarea
          name="reason"
          required
          minLength={5}
          maxLength={1000}
          rows={3}
        />
      </label>
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
      <Button disabled={pending || !!state.success}>
        {pending ? (
          <LoaderCircle size={18} className="animate-spin" />
        ) : (
          <ShieldCheck size={18} />
        )}
        Registar decisão
      </Button>
    </form>
  );
}

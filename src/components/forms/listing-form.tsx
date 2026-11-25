"use client";
import { useActionState } from "react";
import { Save, Send, LoaderCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-select";
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
        <FormSelect
          name="organizationId"
          label="Negócio"
          defaultValue={item?.organization_id}
          required
          options={organizations
            .filter((o) => !item || o.id === item.organization_id)
            .map((o) => ({ value: o.id, label: o.name }))}
        />
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
        <FormSelect
          name="category"
          label="Categoria"
          defaultValue={item?.category ?? "experiencias"}
          options={[
            { value: "estadias", label: "Alojamento" },
            { value: "experiencias", label: "Experiência" },
            { value: "restaurantes", label: "Restaurante" },
            { value: "eventos", label: "Evento" },
            { value: "destinos", label: "Destino" },
          ]}
        />
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
        <FormSelect
          name="unit"
          label="Preço por"
          defaultValue={item?.price_unit ?? "pessoa"}
          options={["pessoa", "noite", "entrada", "mesa", "grupo"].map((u) => ({
            value: u,
            label: u,
          }))}
        />
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
        <FormSelect
          name="decision"
          label="Decisão"
          required
          options={[
            { value: "", label: "Selecciona" },
            { value: "approved", label: "Aprovar e publicar" },
            { value: "rejected", label: "Pedir ajustes" },
          ]}
        />
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

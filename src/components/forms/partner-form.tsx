"use client";
import { Send, LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { submitPartner } from "@/features/partners/actions";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-select";
export function PartnerForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(submitPartner, {});
  return (
    <form action={action} className="account-form partner-form">
      <label>
        Nome do negócio
        <input
          name="name"
          required
          minLength={2}
          maxLength={120}
          autoComplete="organization"
        />
      </label>
      <label>
        Categoria
        <FormSelect
          name="businessType"
          label="Categoria"
          required
          options={[
            { value: "", label: "Selecciona uma categoria" },
            { value: "estadias", label: "Alojamento" },
            { value: "eventos", label: "Organização de eventos" },
            { value: "restaurantes", label: "Restaurante ou bar" },
            { value: "experiencias", label: "Experiências e passeios" },
          ]}
        />
      </label>
      <label>
        Email de contacto
        <input
          type="email"
          name="email"
          required
          defaultValue={email}
          maxLength={254}
        />
      </label>
      <label>
        Telefone
        <input
          type="tel"
          name="phone"
          required
          minLength={7}
          maxLength={30}
          placeholder="+258 …"
          autoComplete="tel"
        />
      </label>
      <label>
        Localização
        <input
          name="location"
          required
          minLength={2}
          maxLength={160}
          placeholder="Cidade, bairro ou praia"
        />
      </label>
      <label>
        Conta-nos sobre o negócio
        <textarea
          name="description"
          required
          minLength={20}
          maxLength={2000}
          rows={5}
        />
        <small>
          Entre 20 e 2000 caracteres. Não incluas documentos de identificação ou
          dados bancários.
        </small>
      </label>
      <p className="notice">
        A equipa IBIZA analisará a candidatura. O envio não publica serviços nem
        garante aprovação.
      </p>
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? (
          <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
        ) : (
          <Send size={18} aria-hidden="true" />
        )}
        {pending ? "A enviar…" : "Enviar candidatura"}
      </Button>
    </form>
  );
}

"use client";
import { useActionState } from "react";
import { submitPartner } from "@/features/partners/actions";
import { Button } from "@/components/ui/button";
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
        <select name="businessType" required>
          <option value="">Selecciona uma categoria</option>
          <option value="estadias">Alojamento</option>
          <option value="eventos">Organização de eventos</option>
          <option value="restaurantes">Restaurante ou bar</option>
          <option value="experiencias">Experiências e passeios</option>
        </select>
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
        {pending ? "A enviar…" : "Enviar candidatura"}
      </Button>
    </form>
  );
}

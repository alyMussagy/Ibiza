"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { ArrowRight, MapPin, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categories } from "@/features/listings/catalog";
export function DiscoveryJourney() {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState("");
  const [destination, setDestination] = useState("");
  const title = useRef<HTMLHeadingElement>(null);
  function go(next: number) {
    setStep(next);
    requestAnimationFrame(() => title.current?.focus());
  }
  return (
    <section className="journey-panel" aria-label="Escolher o meu plano">
      <ol className="journey-progress" aria-label="Etapas">
        <li aria-current={step === 1 ? "step" : undefined}>
          01 · O que te apetece
        </li>
        <li aria-current={step === 2 ? "step" : undefined}>
          02 · Onde queres ir
        </li>
        <li>03 · Explorar opções</li>
      </ol>
      <h2 ref={title} tabIndex={-1}>
        {step === 1
          ? "O que vamos descobrir?"
          : "Qual é o teu próximo destino?"}
      </h2>
      <p>
        {step === 1
          ? "Escolhe uma categoria para começar."
          : "Podes escolher um lugar ou explorar toda a região."}
      </p>
      <form action="/ofertas" method="get">
        <input type="hidden" name="categoria" value={category} />
        <input type="hidden" name="local" value={destination} />
        {step === 1 ? (
          <fieldset className="journey-options">
            <legend className="sr-only">Tipo de plano</legend>
            {categories.map((c) => (
              <label className="journey-option" key={c.slug}>
                <input
                  type="radio"
                  name="plan-choice"
                  checked={category === c.slug}
                  onChange={() => setCategory(c.slug)}
                />
                <Compass size={22} aria-hidden="true" />
                <strong>{c.label}</strong>
                <span>{c.short}</span>
              </label>
            ))}
          </fieldset>
        ) : (
          <fieldset className="journey-options destinations">
            <legend className="sr-only">Destino</legend>
            {["", "Tofo", "Barra", "Vilanculos"].map((d) => (
              <label className="journey-option" key={d}>
                <input
                  type="radio"
                  name="destination-choice"
                  checked={destination === d}
                  onChange={() => setDestination(d)}
                />
                <MapPin size={22} aria-hidden="true" />
                <strong>{d || "Surpreende-me"}</strong>
                <span>
                  {d ? "Descobrir este lugar" : "Toda a região de Inhambane"}
                </span>
              </label>
            ))}
          </fieldset>
        )}
        <div className="journey-actions">
          {step === 2 ? (
            <Button type="button" variant="outline" onClick={() => go(1)}>
              Voltar
            </Button>
          ) : (
            <Link href="/ofertas" className="text-link">
              Prefiro explorar tudo
            </Link>
          )}
          {step === 1 ? (
            <Button
              type="button"
              disabled={!category}
              onClick={(event) => {
                event.preventDefault();
                go(2);
              }}
            >
              Escolher destino <ArrowRight size={18} aria-hidden="true" />
            </Button>
          ) : (
            <Button key="show-options" type="submit">
              Ver opções <ArrowRight size={18} aria-hidden="true" />
            </Button>
          )}
        </div>
      </form>
      <p className="journey-note">
        Descobre ofertas publicadas por parceiros aprovados. Consulta a
        disponibilidade antes de enviar o teu pedido.
      </p>
      <div className="journey-footer">
        <Link href="/perfil">A minha conta</Link>
        <Link href="/business/candidatura">
          Quero apresentar o meu negócio →
        </Link>
      </div>
    </section>
  );
}

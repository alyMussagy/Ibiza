import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  Compass,
  Music2,
  Utensils,
  Waves,
  MapPin,
  MoveUpRight,
} from "lucide-react";
import { categories, demoListings } from "@/features/listings/catalog";
import { SearchForm } from "@/components/marketplace/search-form";
import { ListingCard } from "@/components/marketplace/listing-card";
import { Button } from "@/components/ui/button";
const icons = [Compass, BedDouble, Music2, Utensils, Waves];
export default function Home() {
  return (
    <main id="main">
      <section className="hero shell">
        <div className="hero-photo">
          <Image
            src="/images/hero.jpg"
            alt="Costa tropical e oceano azul, fotografia ilustrativa"
            fill
            priority
            sizes="100vw"
          />
          <div className="hero-shade" />
          <div className="hero-copy">
            <span className="hero-kicker">
              <span /> MOÇAMBIQUE, MAIS PERTO DE TI
            </span>
            <h1>
              Há lugares.
              <br />E há lugares
              <br />
              <em>que ficam contigo.</em>
            </h1>
            <p>
              O próximo pode estar em Inhambane.
              <br />
              Descobre o teu, com o IBIZA.
            </p>
            <Link className="hero-link" href="/destinos">
              Deixa-te inspirar <ArrowUpRight size={20} />
            </Link>
          </div>
          <div className="hero-location">
            <MapPin size={16} />
            <span>
              Inspiração: costa de Inhambane
              <small>Fotografia ilustrativa</small>
            </span>
          </div>
        </div>
        <SearchForm />
      </section>
      <section
        className="shell category-strip"
        aria-label="Descobrir por categoria"
      >
        {categories.map((c, i) => {
          const Icon = icons[i];
          return (
            <Link href={`/${c.slug}`} key={c.slug}>
              <Icon size={25} strokeWidth={1.5} />
              <span>{c.label}</span>
              <small>{c.short}</small>
            </Link>
          );
        })}
      </section>
      <section className="shell section">
        <div className="section-heading">
          <div>
            <span className="eyebrow coral">A TUA PRÓXIMA ESCAPADINHA</span>
            <h2>Inhambane sabe a liberdade.</h2>
            <p>Entre o mar, a areia e a vontade de ficar mais um dia.</p>
          </div>
          <Link className="text-link" href="/destinos">
            Todos os destinos <ArrowRight size={18} />
          </Link>
        </div>
        <div className="listing-grid">
          {demoListings
            .filter((l) => l.category === "destinos")
            .map((l) => (
              <ListingCard key={l.slug} listing={l} />
            ))}
        </div>
        <p className="demo-note">
          <span /> Conteúdo de demonstração · Fotografias ilustrativas · Sem
          reservas ou ofertas reais
        </p>
      </section>
      <section className="discovery-section">
        <div className="shell discovery-grid">
          <div className="discovery-copy">
            <span className="eyebrow coral">MAIS DO QUE UM DESTINO</span>
            <h2>
              Vai pelo lugar.
              <br />
              Fica pelo que sentes.
            </h2>
            <p>
              Uma mesa com vista. Uma noite diferente. Um mergulho fora da
              rotina. Há muitas formas de viver Inhambane.
            </p>
            <Button asChild>
              <Link href="/explorar">
                Encontra a tua próxima história <ArrowUpRight size={18} />
              </Link>
            </Button>
          </div>
          <Link className="experience-tile" href="/experiencias">
            <Image
              src="/images/island.jpg"
              alt="Mar tropical, imagem ilustrativa de experiências"
              fill
              sizes="(max-width: 760px) 100vw, 35vw"
            />
            <div>
              <span>IBIZA EXPERIENCES</span>
              <h3>
                O melhor está
                <br />
                lá fora.
              </h3>
              <span className="tile-arrow">
                <MoveUpRight />
              </span>
            </div>
          </Link>
          <div className="mini-tiles">
            <Link href="/restaurantes" className="mini-tile">
              <Utensils size={25} />
              <span>FOOD & DRINKS</span>
              <h3>
                À mesa,
                <br />
                sem pressa.
              </h3>
              <ArrowUpRight />
            </Link>
            <Link href="/eventos" className="mini-tile dark">
              <Music2 size={25} />
              <span>IBIZA EVENTS</span>
              <h3>
                Dá outro ritmo
                <br />
                aos teus dias.
              </h3>
              <ArrowUpRight />
            </Link>
          </div>
        </div>
      </section>
      <section className="shell section">
        <div className="section-heading">
          <div>
            <span className="eyebrow coral">PARA CADA FORMA DE VIAJAR</span>
            <h2>O teu tempo. A tua escolha.</h2>
            <p>Uma primeira amostra do que estamos a construir.</p>
          </div>
          <Link href="/explorar" className="text-link">
            Explorar tudo <ArrowRight size={18} />
          </Link>
        </div>
        <div className="listing-grid">
          {demoListings
            .filter((l) =>
              ["estadias", "restaurantes", "experiencias"].includes(l.category),
            )
            .map((l) => (
              <ListingCard key={l.slug} listing={l} />
            ))}
        </div>
      </section>
      <section className="shell">
        <div className="partner-banner">
          <div>
            <span className="eyebrow">CRESCEMOS COM QUEM É DAQUI</span>
            <h2>O teu negócio faz parte da viagem.</h2>
            <p>
              Estamos a preparar um novo ponto de encontro entre viajantes e
              parceiros locais.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/business">
              Conhecer o IBIZA Business <ArrowUpRight size={18} />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

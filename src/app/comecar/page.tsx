import { DiscoveryJourney } from "@/components/marketplace/discovery-journey";
export const metadata = { title: "O teu próximo plano" };
export default function Start() {
  return (
    <main id="main" className="shell journey-page">
      <span className="eyebrow coral">DESCOBRE. ESCOLHE. VIVE.</span>
      <h1>
        A tua próxima história
        <br />
        começa com um plano.
      </h1>
      <p className="lead">
        Praia, uma escapadinha ou novos sabores? Encontra inspiração à tua
        medida.
      </p>
      <DiscoveryJourney />
    </main>
  );
}

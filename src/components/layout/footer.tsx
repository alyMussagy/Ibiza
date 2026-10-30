import Link from "next/link";
import { Brand } from "./brand";
export function Footer() {
  return (
    <footer className="footer">
      <div className="shell footer-main">
        <div>
          <Brand />
          <p>Descobre. Reserva. Vive.</p>
          <small>Feito a pensar em Moçambique.</small>
        </div>
        <div>
          <strong>O teu próximo destino</strong>
          <Link href="/explorar">Explorar Inhambane</Link>
          <Link href="/destinos">Destinos</Link>
          <Link href="/experiencias">Experiências</Link>
        </div>
        <div>
          <strong>Faz parte do IBIZA</strong>
          <Link href="/business">Para parceiros</Link>
          <Link href="/sobre">Sobre o projecto</Link>
          <Link href="/sobre#privacidade">Privacidade nesta versão</Link>
        </div>
      </div>
      <div className="shell footer-bottom">
        <span>© {new Date().getFullYear()} IBIZA</span>
        <span>Português · Moçambique · MZN</span>
        <span>Versão de demonstração</span>
      </div>
    </footer>
  );
}

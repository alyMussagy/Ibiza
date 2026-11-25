"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Camera, ScanLine, Square, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { IScannerControls } from "@zxing/browser";
export function TicketScanner() {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null),
    controls = useRef<IScannerControls | null>(null),
    busy = useRef(false),
    mounted = useRef(true),
    generation = useRef(0);
  const [running, setRunning] = useState(false),
    [message, setMessage] = useState(""),
    [pending, setPending] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current++;
      controls.current?.stop();
    };
  }, []);
  function stop() {
    generation.current++;
    controls.current?.stop();
    controls.current = null;
    setRunning(false);
  }
  async function check(value: string) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    stop();
    try {
      const token = value.trim().replace(/^IBIZA:/, "");
      if (!/^[0-9a-f-]{72}$/.test(token)) {
        setMessage("Código inválido. Nenhuma entrada registada.");
        return;
      }
      const { data, error } = await createClient().rpc("check_in_ticket", {
        qr_token: token,
      });
      if (error) throw new Error();
      if (data === "accepted") router.refresh();
      setMessage(
        (
          {
            accepted: "Entrada autorizada e registada.",
            used: "Este bilhete já foi utilizado. Não autorizar nova entrada.",
            inactive: "Bilhete cancelado, fora do horário ou inactivo.",
            invalid: "Bilhete inválido ou de outro negócio.",
          } as Record<string, string>
        )[data] ?? "Não foi possível validar.",
      );
    } catch {
      setMessage(
        "Sem confirmação do servidor. Verifica a ligação e tenta novamente.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  async function start() {
    const current = ++generation.current;
    setMessage("");
    setRunning(true);
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      if (!mounted.current || current !== generation.current) return;
      const reader = new BrowserQRCodeReader();
      const session = await reader.decodeFromVideoDevice(
        undefined,
        video.current!,
        (result, _error, scanner) => {
          if (result && current === generation.current) {
            scanner.stop();
            void check(result.getText());
          }
        },
      );
      if (!mounted.current || current !== generation.current) {
        session.stop();
        return;
      }
      controls.current = session;
    } catch {
      setRunning(false);
      setMessage(
        "Não foi possível abrir a câmara. Autoriza o acesso ou usa o código manual.",
      );
    }
  }
  return (
    <section className="account-card">
      <p>
        A validação exige ligação à internet. A entrada abre duas horas antes do
        evento e termina com o evento.
      </p>
      <video
        ref={video}
        muted
        playsInline
        style={{ width: "100%", maxWidth: 520, borderRadius: 18 }}
      />
      <div className="account-links">
        <Button onClick={start} disabled={running || pending}>
          <Camera size={18} />
          Abrir câmara
        </Button>
        <Button variant="outline" onClick={stop} disabled={!running}>
          <Square size={18} />
          Parar câmara
        </Button>
      </div>
      <form
        className="account-form"
        onSubmit={(e) => {
          e.preventDefault();
          void check(String(new FormData(e.currentTarget).get("code") ?? ""));
        }}
      >
        <label>
          Código do bilhete
          <input name="code" required autoComplete="off" maxLength={78} />
        </label>
        <Button disabled={pending}>
          {pending ? (
            <LoaderCircle className="animate-spin" size={18} />
          ) : (
            <ScanLine size={18} />
          )}
          Validar entrada
        </Button>
      </form>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
    </section>
  );
}

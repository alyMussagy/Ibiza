"use client";
import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
export function ShareButton() {
  const [message, setMessage] = useState("");
  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url: location.href });
      } else {
        await navigator.clipboard.writeText(location.href);
        setMessage("Ligação copiada.");
      }
    } catch {
      setMessage(
        "Não foi possível partilhar. Podes copiar o endereço do navegador.",
      );
    }
  }
  return (
    <div>
      <Button variant="outline" onClick={share}>
        <Share2 size={17} />
        Partilhar inspiração
      </Button>
      <p role="status">{message}</p>
    </div>
  );
}

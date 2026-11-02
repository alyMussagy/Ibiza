"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  Archive,
  LoaderCircle,
  Save,
  Brush,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
type Photo = { id: string; alt: string; position: number };
export function ListingOperations({
  id,
  revision,
  photos,
  editable,
  archived,
}: {
  id: string;
  revision: number;
  photos: Photo[];
  editable: boolean;
  archived: boolean;
}) {
  const [items, setItems] = useState(
    [...photos].sort((a, b) => a.position - b.position),
  );
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter();
  function move(index: number, delta: number) {
    setItems((old) => {
      const next = [...old];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next;
    });
  }
  async function run(action: "save" | "cleanup" | "archive") {
    setPending(true);
    setMessage("");
    try {
      const db = createClient();
      if (action !== "cleanup") {
        const result =
          action === "save"
            ? await db.rpc("manage_listing_photos", {
                target_listing: id,
                expected_revision: revision,
                ordered_photos: items.map((p) => p.id),
              })
            : await db.rpc("archive_listing", {
                target_listing: id,
                expected_revision: revision,
              });
        if (result.error)
          throw new Error(
            "Não foi possível guardar. Actualiza a página e confirma as permissões.",
          );
      }
      if (action !== "archive") {
        const claimed = await db.rpc("claim_photo_cleanup", {
          target_listing: id,
        });
        if (claimed.error)
          throw new Error(
            "As alterações foram guardadas, mas a limpeza não terminou. Tenta limpar novamente.",
          );
        const paths = (claimed.data ?? []).map(
          (p: { storage_path: string }) => p.storage_path,
        );
        if (paths.length) {
          const removed = await db.storage.from("listing-photos").remove(paths);
          if (removed.error)
            throw new Error(
              "Limpeza pendente. Podes tentar novamente sem perder as alterações.",
            );
        }
      }
      setMessage(
        action === "archive"
          ? "Oferta arquivada. As reservas existentes continuam disponíveis."
          : "Alterações guardadas e uploads incompletos limpos.",
      );
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Não foi possível concluir.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="account-card">
      <h3>Gerir fotografias e publicação</h3>
      {editable && (
        <>
          <p>
            A primeira fotografia será a capa. Remove ou ordena e guarda as
            alterações.
          </p>
          <div className="photo-editor-grid">
            {items.map((photo, index) => (
              <article key={photo.id}>
                <Image
                  src={"/media/" + photo.id}
                  alt={photo.alt}
                  width={240}
                  height={160}
                  unoptimized
                  style={{
                    width: "100%",
                    height: 160,
                    objectFit: "cover",
                    borderRadius: 12,
                  }}
                />
                <p>
                  {index === 0 ? "Capa · " : ""}
                  {photo.alt}
                </p>
                <div className="account-links">
                  <Button
                    variant="outline"
                    disabled={pending || index === 0}
                    aria-label={"Mover para antes: " + photo.alt}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp size={16} />
                    Antes
                  </Button>
                  <Button
                    variant="outline"
                    disabled={pending || index === items.length - 1}
                    aria-label={"Mover para depois: " + photo.alt}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown size={16} />
                    Depois
                  </Button>
                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      setItems(items.filter((p) => p.id !== photo.id))
                    }
                  >
                    <Trash2 size={16} />
                    Remover
                  </Button>
                </div>
              </article>
            ))}
          </div>
          <Button disabled={pending} onClick={() => run("save")}>
            <Save size={18} />
            Guardar fotografias
          </Button>
        </>
      )}
      <div className="account-links">
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => run("cleanup")}
        >
          <Brush size={18} />
          Limpar uploads incompletos
        </Button>
        {!archived && (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => {
              if (
                window.confirm(
                  "Arquivar esta oferta? Deixará de receber novos pedidos. As reservas existentes serão mantidas.",
                )
              )
                void run("archive");
            }}
          >
            <Archive size={18} />
            Arquivar oferta
          </Button>
        )}
      </div>
      {pending && (
        <p role="status">
          <LoaderCircle className="animate-spin" size={18} />A processar…
        </p>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
    </section>
  );
}

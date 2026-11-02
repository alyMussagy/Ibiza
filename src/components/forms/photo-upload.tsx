"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
export function PhotoUpload({
  id,
  revision,
}: {
  id: string;
  revision: number;
}) {
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const router = useRouter();
  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("photo");
    const alt = String(data.get("alt") ?? "").trim();
    if (
      !(file instanceof File) ||
      !file.size ||
      file.size > 3145728 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      alt.length < 3 ||
      alt.length > 200
    ) {
      setError("Escolhe uma imagem JPG, PNG ou WebP até 3 MB e descreve-a.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const supabase = createClient();
      const ext =
        file.type === "image/jpeg"
          ? "jpg"
          : file.type === "image/png"
            ? "png"
            : "webp";
      const path = `${id}/${crypto.randomUUID()}.${ext}`;
      const result = await supabase.storage
        .from("listing-photos")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (result.error)
        throw new Error(
          "Não foi possível carregar. O anúncio deve estar em rascunho e o negócio aprovado.",
        );
      const attached = await supabase.rpc("attach_listing_photo", {
        target_listing: id,
        object_name: path,
        alternative_text: alt,
        expected_revision: revision,
      });
      if (attached.error)
        throw new Error(
          "A fotografia foi carregada mas não associada. Actualiza a página antes de tentar novamente.",
        );
      form.reset();
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível carregar a fotografia.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={upload} className="account-form">
      <label>
        Fotografia
        <input
          type="file"
          name="photo"
          accept="image/jpeg,image/png,image/webp"
          required
          disabled={pending}
        />
      </label>
      <label>
        Descrição da fotografia
        <input
          name="alt"
          minLength={3}
          maxLength={200}
          required
          placeholder="Ex.: Vista da varanda sobre a praia"
          disabled={pending}
        />
      </label>
      <p>
        Até 8 fotografias, com 3 MB cada. Adiciona-as ao rascunho antes de
        enviar para análise.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <Button disabled={pending}>
        {pending ? (
          <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
        ) : (
          <Upload size={18} aria-hidden="true" />
        )}
        {pending ? "A carregar…" : "Adicionar fotografia"}
      </Button>
    </form>
  );
}

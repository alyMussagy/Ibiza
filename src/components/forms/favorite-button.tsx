"use client";
import { useActionState } from "react";
import { Heart, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setFavorite } from "@/features/listings/favorite-actions";
export function FavoriteButton({ id, saved }: { id: string; saved: boolean }) {
  const [state, action, pending] = useActionState(setFavorite, {});
  return (
    <form action={action} className="favorite-action">
      <input type="hidden" name="listingId" value={id} />
      <input type="hidden" name="desired" value={String(!saved)} />
      <Button variant="outline" disabled={pending} aria-pressed={saved}>
        {pending ? (
          <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
        ) : (
          <Heart
            size={18}
            fill={saved ? "currentColor" : "none"}
            aria-hidden="true"
          />
        )}
        {saved ? "Retirar dos favoritos" : "Guardar favorito"}
      </Button>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="sr-only" role="status">
          {state.success}
        </p>
      )}
    </form>
  );
}

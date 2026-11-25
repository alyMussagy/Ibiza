"use client";
import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="#4285F4" d="M21.35 12.23c0-.71-.06-1.39-.18-2.05H12v3.87h5.24a4.48 4.48 0 0 1-1.95 2.94v2.45h3.16c1.85-1.7 2.9-4.2 2.9-7.21Z" />
      <path fill="#34A853" d="M12 21.5c2.64 0 4.86-.87 6.45-2.36l-3.16-2.45c-.87.58-1.99.93-3.29.93a5.8 5.8 0 0 1-5.46-4.03H3.28v2.52A9.75 9.75 0 0 0 12 21.5Z" />
      <path fill="#FBBC05" d="M6.54 13.59a5.86 5.86 0 0 1 0-3.18V7.89H3.28a9.75 9.75 0 0 0 0 8.22l3.26-2.52Z" />
      <path fill="#EA4335" d="M12 6.38c1.44 0 2.72.49 3.74 1.47l2.8-2.8A9.4 9.4 0 0 0 12 2.5a9.75 9.75 0 0 0-8.72 5.39l3.26 2.52A5.8 5.8 0 0 1 12 6.38Z" />
    </svg>
  );
}

export function GoogleAuthButton({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      className="google-auth-button"
      disabled={!enabled || pending}
    >
      {pending ? <LoaderCircle size={20} className="animate-spin" aria-hidden="true" /> : <GoogleMark />}
      {pending ? "A ligar ao Google…" : "Continuar com Google"}
    </Button>
  );
}


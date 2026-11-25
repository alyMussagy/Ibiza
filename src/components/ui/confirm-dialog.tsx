"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="confirm-overlay" />
        <AlertDialog.Content className="confirm-dialog">
          <span className="eyebrow coral">CONFIRMAÇÃO IBIZA</span>
          <AlertDialog.Title>{title}</AlertDialog.Title>
          <AlertDialog.Description>{description}</AlertDialog.Description>
          <div className="confirm-actions">
            <AlertDialog.Cancel asChild>
              <Button type="button" variant="outline">
                <X size={17} aria-hidden="true" />
                Voltar
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button type="button" onClick={onConfirm}>
                {confirmLabel}
                <ArrowRight size={17} aria-hidden="true" />
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

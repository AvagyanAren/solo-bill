"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  setInvoiceStatusAction,
  undoInvoicePaymentStatusAction,
} from "@/app/actions/invoices";
import { Button } from "@/components/ui/button";
import { canTransitionInvoice } from "@/lib/billing/lifecycle";
import type { InvoiceStatusValue } from "@/lib/invoice-status";
import { useToast } from "@/providers/toast-provider";

type InvoiceStatusToggleProps = {
  invoiceId: string;
  status: InvoiceStatusValue;
  size?: "default" | "sm";
};

function nextManualPaymentStatus(
  status: InvoiceStatusValue,
): "paid" | "unpaid" | null {
  if (status === "paid") {
    return canTransitionInvoice(status, "unpaid") ? "unpaid" : null;
  }
  if (status === "unpaid" || status === "sent") {
    return canTransitionInvoice(status, "paid") ? "paid" : null;
  }
  return null;
}

export function InvoiceStatusToggle({
  invoiceId,
  status,
  size = "default",
}: InvoiceStatusToggleProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const nextStatus = nextManualPaymentStatus(status);
  if (!nextStatus) {
    return null;
  }

  const targetStatus = nextStatus;
  const label = targetStatus === "paid" ? "Mark as paid" : "Mark as unpaid";

  function handleClick() {
    const formData = new FormData();
    formData.set("id", invoiceId);
    formData.set("status", targetStatus);
    startTransition(() => {
      void (async () => {
        const result = await setInvoiceStatusAction(formData);
        if (!result.ok) {
          toast({
            title: "Status update failed",
            description: result.error,
            tone: "error",
          });
          return;
        }

        const restoreStatus = result.previousStatus;
        const canUndo =
          restoreStatus != null &&
          ((result.status === "paid" &&
            (restoreStatus === "unpaid" || restoreStatus === "sent")) ||
            (result.status === "unpaid" && restoreStatus === "paid"));

        toast({
          title: result.status === "paid" ? "Marked as paid" : "Marked as unpaid",
          description: canUndo ? "You can undo this change for a short time." : undefined,
          tone: "success",
          action: canUndo
            ? {
                label: "Undo",
                onAction: async () => {
                  const undoData = new FormData();
                  undoData.set("id", invoiceId);
                  undoData.set("expectedCurrentStatus", result.status);
                  undoData.set("restoreStatus", restoreStatus);
                  const undoResult = await undoInvoicePaymentStatusAction(undoData);
                  if (!undoResult.ok) {
                    toast({
                      title: "Undo failed",
                      description: undoResult.error,
                      tone: "error",
                    });
                    return;
                  }
                  toast({
                    title: "Change undone",
                    description: `Restored to ${undoResult.status}.`,
                    tone: "success",
                  });
                  router.refresh();
                },
              }
            : undefined,
        });
        router.refresh();
      })();
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      disabled={pending}
      onClick={handleClick}
      aria-label={label}
    >
      {pending ? "Updating…" : label}
    </Button>
  );
}

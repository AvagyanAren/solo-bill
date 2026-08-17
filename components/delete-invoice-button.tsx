"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { deleteInvoiceAction } from "@/app/actions/invoices";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/providers/toast-provider";

type DeleteInvoiceButtonProps = {
  invoiceId: string;
  invoiceLabel: string;
};

export function DeleteInvoiceButton({ invoiceId, invoiceLabel }: DeleteInvoiceButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    const formData = new FormData();
    formData.set("id", invoiceId);
    startTransition(() => {
      void (async () => {
        const result = await deleteInvoiceAction(formData);
        if (!result.ok) {
          toast({
            title: "Delete failed",
            description: result.error,
            tone: "error",
          });
          return;
        }
        toast({
          title: "Invoice deleted",
          description: `${invoiceLabel} was permanently removed.`,
          tone: "success",
        });
        router.push("/dashboard/invoices");
        router.refresh();
      })();
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger>Delete</AlertDialogTrigger>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete invoice?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-primary">{invoiceLabel}</span> will be permanently
            removed. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={handleConfirm}>
            {pending ? "Deleting…" : "Delete invoice"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}

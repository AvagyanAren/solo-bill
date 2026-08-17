"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { deleteClientAction } from "@/app/actions/clients";
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

type DeleteClientButtonProps = {
  clientId: string;
  clientName: string;
};

export function DeleteClientButton({ clientId, clientName }: DeleteClientButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    const formData = new FormData();
    formData.set("id", clientId);
    startTransition(() => {
      void (async () => {
        try {
          await deleteClientAction(formData);
          toast({
            title: "Client deleted",
            description: `${clientName} was permanently removed.`,
            tone: "success",
          });
          router.refresh();
        } catch {
          toast({
            title: "Delete failed",
            description: "Unable to delete this client.",
            tone: "error",
          });
        }
      })();
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger>Delete</AlertDialogTrigger>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete client?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-primary">{clientName}</span> and all invoices billed to
            them will be permanently removed. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={handleConfirm}>
            {pending ? "Deleting…" : "Delete client"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}

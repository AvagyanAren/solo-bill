"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { archiveClientAction } from "@/app/actions/clients";
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

type ArchiveClientButtonProps = {
  clientId: string;
  clientName: string;
};

export function ArchiveClientButton({ clientId, clientName }: ArchiveClientButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    const formData = new FormData();
    formData.set("id", clientId);
    startTransition(() => {
      void (async () => {
        try {
          await archiveClientAction(formData);
          toast({
            title: "Client archived",
            description: `${clientName} is hidden from your active list. Existing invoices are unchanged.`,
            tone: "success",
          });
          router.refresh();
        } catch {
          toast({
            title: "Archive failed",
            description: "Unable to archive this client.",
            tone: "error",
          });
        }
      })();
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger>Archive</AlertDialogTrigger>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive client?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-primary">{clientName}</span> will be hidden from client
            lists and new invoices. Existing invoices stay available; you can restore the client later
            from the archived section.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={handleConfirm}>
            {pending ? "Archiving…" : "Archive client"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}

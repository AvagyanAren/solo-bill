"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { unarchiveClientAction } from "@/app/actions/clients";
import { buttonVariants } from "@/components/ui/button-variants";
import { cx } from "@/lib/utils/cx";
import { useToast } from "@/providers/toast-provider";

type UnarchiveClientButtonProps = {
  clientId: string;
  clientName: string;
};

export function UnarchiveClientButton({ clientId, clientName }: UnarchiveClientButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const formData = new FormData();
    formData.set("id", clientId);
    startTransition(() => {
      void (async () => {
        try {
          await unarchiveClientAction(formData);
          toast({
            title: "Client restored",
            description: `${clientName} is active again.`,
            tone: "success",
          });
          router.refresh();
        } catch {
          toast({
            title: "Restore failed",
            description: "Unable to restore this client.",
            tone: "error",
          });
        }
      })();
    });
  }

  return (
    <button
      type="button"
      className={cx(buttonVariants({ variant: "outline", size: "sm" }), "min-h-11")}
      disabled={pending}
      onClick={handleClick}
    >
      {pending ? "Restoring…" : "Restore"}
    </button>
  );
}

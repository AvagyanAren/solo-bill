"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { duplicateInvoiceAction } from "@/app/actions/invoices";
import { Button } from "@/components/ui/button";

type DuplicateInvoiceButtonProps = {
  invoiceId: string;
};

export function DuplicateInvoiceButton({ invoiceId }: DuplicateInvoiceButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const formData = new FormData();
    formData.set("id", invoiceId);
    startTransition(() => {
      void (async () => {
        const result = await duplicateInvoiceAction(formData);
        if (result.ok) {
          router.push(`/invoice/${result.invoiceId}/edit`);
          router.refresh();
        }
      })();
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="min-h-11"
      disabled={pending}
      onClick={handleClick}
    >
      {pending ? "Duplicating…" : "Duplicate"}
    </Button>
  );
}

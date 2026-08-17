"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  DialogTrigger as AriaDialogTrigger,
  Heading,
} from "react-aria-components";

import {
  sendInvoiceEmailAction,
  sendInvoiceReminderAction,
} from "@/app/actions/delivery";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button-variants";
import { cx } from "@/lib/utils/cx";
import { useToast } from "@/providers/toast-provider";

type DeliveryKind = "invoice" | "reminder";

type InvoiceDeliveryActionsProps = {
  invoiceId: string;
  invoiceNumber: string;
  defaultRecipient: string;
  defaultInvoiceSubject: string;
  defaultInvoiceBody: string;
  defaultReminderSubject: string;
  defaultReminderBody: string;
  canSend: boolean;
  canRemind: boolean;
};

function DeliveryDialog({
  kind,
  invoiceId,
  invoiceNumber,
  defaultRecipient,
  defaultSubject,
  defaultBody,
  triggerLabel,
  title,
  description,
}: {
  kind: DeliveryKind;
  invoiceId: string;
  invoiceNumber: string;
  defaultRecipient: string;
  defaultSubject: string;
  defaultBody: string;
  triggerLabel: string;
  title: string;
  description: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    recipient: defaultRecipient,
    subject: defaultSubject,
    bodyText: defaultBody,
  });
  const [error, setError] = useState<string | null>(null);

  const recipient = open ? draft.recipient : defaultRecipient;
  const subject = open ? draft.subject : defaultSubject;
  const bodyText = open ? draft.bodyText : defaultBody;

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setDraft({
        recipient: defaultRecipient,
        subject: defaultSubject,
        bodyText: defaultBody,
      });
      setError(null);
    }
    setOpen(nextOpen);
  }

  function handleSubmit() {
    setError(null);
    startTransition(() => {
      void (async () => {
        const action =
          kind === "invoice" ? sendInvoiceEmailAction : sendInvoiceReminderAction;
        const result = await action({
          invoiceId,
          recipient,
          subject,
          bodyText,
        });
        if (!result.ok) {
          setError(result.error);
          toast({
            title: kind === "invoice" ? "Send failed" : "Reminder failed",
            description: result.error,
            tone: "error",
          });
          return;
        }
        toast({
          title: kind === "invoice" ? "Invoice recorded" : "Reminder recorded",
          description: result.mock
            ? `Saved to local mock outbox for ${invoiceNumber}.`
            : `Sent for ${invoiceNumber}.`,
          tone: "success",
        });
        router.refresh();
        setOpen(false);
      })();
    });
  }

  return (
    <AriaDialogTrigger isOpen={open} onOpenChange={handleOpenChange}>
      <Button variant="outline" size="sm" className="min-h-11">
        {triggerLabel}
      </Button>
      <ModalOverlay>
        <Modal className="w-full max-w-lg p-6">
          <Dialog>
            <Heading slot="title" className="text-lg font-semibold text-primary">
              {title}
            </Heading>
            <p className="mt-2 text-sm text-tertiary">{description}</p>
            <div className="mt-4 space-y-4">
              <Input
                label="Recipient"
                type="email"
                value={recipient}
                onChange={(value) =>
                  setDraft((prev) => ({ ...prev, recipient: value }))
                }
                isRequired
                autoComplete="email"
              />
              <Input
                label="Subject"
                value={subject}
                onChange={(value) =>
                  setDraft((prev) => ({ ...prev, subject: value }))
                }
                isRequired
              />
              <Textarea
                label="Message"
                value={bodyText}
                onChange={(value) =>
                  setDraft((prev) => ({ ...prev, bodyText: value }))
                }
                rows={8}
                isRequired
              />
              {error ? (
                <p className="text-sm text-error-primary" role="alert">
                  {error}
                </p>
              ) : null}
              <p className="text-xs text-tertiary">
                Delivery uses the SoloBill mock email adapter. No external email API is
                called.
              </p>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                className="min-h-11"
                disabled={pending}
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="min-h-11"
                disabled={pending}
                isLoading={pending}
                onClick={handleSubmit}
              >
                {pending ? "Sending…" : triggerLabel}
              </Button>
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </AriaDialogTrigger>
  );
}

export function InvoiceDeliveryActions({
  invoiceId,
  invoiceNumber,
  defaultRecipient,
  defaultInvoiceSubject,
  defaultInvoiceBody,
  defaultReminderSubject,
  defaultReminderBody,
  canSend,
  canRemind,
}: InvoiceDeliveryActionsProps) {
  return (
    <>
      <a
        href={`/api/invoices/${invoiceId}/pdf`}
        className={cx(buttonVariants({ variant: "outline", size: "sm" }), "min-h-11")}
        download
      >
        Download PDF
      </a>
      {canSend ? (
        <DeliveryDialog
          kind="invoice"
          invoiceId={invoiceId}
          invoiceNumber={invoiceNumber}
          defaultRecipient={defaultRecipient}
          defaultSubject={defaultInvoiceSubject}
          defaultBody={defaultInvoiceBody}
          triggerLabel="Send invoice"
          title="Send invoice"
          description="Email this invoice to your client. Delivery is recorded in the local mock outbox and activity timeline."
        />
      ) : null}
      {canRemind ? (
        <DeliveryDialog
          kind="reminder"
          invoiceId={invoiceId}
          invoiceNumber={invoiceNumber}
          defaultRecipient={defaultRecipient}
          defaultSubject={defaultReminderSubject}
          defaultBody={defaultReminderBody}
          triggerLabel="Send reminder"
          title="Send payment reminder"
          description="Remind the client about an unpaid or overdue invoice. Reminder runs are stored for future scheduler/provider wiring."
        />
      ) : null}
    </>
  );
}

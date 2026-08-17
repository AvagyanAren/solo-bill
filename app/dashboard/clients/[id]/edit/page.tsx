import Link from "next/link";
import { notFound } from "next/navigation";

import { ClientForm } from "@/components/client-form";
import { PageShell } from "@/components/page-shell";
import { buttonVariants } from "@/components/ui/button-variants";
import { cx } from "@/lib/utils/cx";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";

type Props = { params: Promise<{ id: string }> };

export default async function EditClientPage({ params }: Props) {
  const session = await requireSession();
  const { id } = await params;
  const client = await prisma.client.findFirst({
    where: { id, userId: session.userId },
  });
  if (!client) {
    notFound();
  }

  return (
    <PageShell
      title="Edit client"
      description="Update contact and billing details."
      lead={
        <Link
          href="/dashboard/clients"
          className={cx(buttonVariants({ variant: "ghost", size: "sm" }), "min-h-11")}
        >
          ← Back to clients
        </Link>
      }
    >
      <ClientForm
        mode="edit"
        clientId={client.id}
        defaultValues={{
          name: client.name,
          email: client.email,
          companyName: client.companyName ?? "",
          phone: client.phone ?? "",
          billingAddress1: client.billingAddress1 ?? "",
          billingAddress2: client.billingAddress2 ?? "",
          billingCity: client.billingCity ?? "",
          billingState: client.billingState ?? "",
          billingPostalCode: client.billingPostalCode ?? "",
          billingCountry: client.billingCountry ?? "",
          taxId: client.taxId ?? "",
          notes: client.notes ?? "",
        }}
      />
    </PageShell>
  );
}

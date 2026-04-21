import Link from "next/link";
import { notFound } from "next/navigation";

import { ClientForm } from "@/components/client-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <Link
          href="/dashboard/clients"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          ← Back to clients
        </Link>
      </div>
      <h1 className="text-xl font-semibold text-foreground">Edit client</h1>
      <p className="mt-1 text-sm text-muted-foreground">Update name or billing email.</p>
      <div className="mt-8">
        <ClientForm
          mode="edit"
          clientId={client.id}
          defaultValues={{ name: client.name, email: client.email }}
        />
      </div>
    </div>
  );
}

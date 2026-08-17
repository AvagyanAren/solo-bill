import Link from "next/link";

import { DeleteClientButton } from "@/components/delete-client-button";
import { PageShell } from "@/components/page-shell";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/db";
import { cx } from "@/lib/utils/cx";
import { requireSession } from "@/lib/require-session";

export default async function ClientsPage() {
  const session = await requireSession();
  const clients = await prisma.client.findMany({
    where: { userId: session.userId },
    orderBy: { name: "asc" },
  });

  return (
    <PageShell
      title="Clients"
      description="People and companies you bill. Used when creating invoices."
      actions={
        <Link href="/dashboard/clients/new" className={cx(buttonVariants(), "min-h-11 shrink-0")}>
          Add client
        </Link>
      }
    >
      {clients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-secondary bg-secondary/30 p-8 text-center">
          <p className="text-sm text-tertiary">No clients yet.</p>
          <Link
            href="/dashboard/clients/new"
            className={cx(buttonVariants({ variant: "link" }), "mt-2")}
          >
            Add your first client
          </Link>
        </div>
      ) : (
        <>
          <ul className="grid gap-3 sm:hidden">
            {clients.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-secondary bg-primary p-4 shadow-xs"
              >
                <p className="font-medium text-primary">{c.name}</p>
                <p className="mt-1 break-all text-sm text-tertiary">{c.email}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/dashboard/clients/${c.id}/edit`}
                    className={cx(buttonVariants({ variant: "outline", size: "sm" }), "min-h-11")}
                  >
                    Edit
                  </Link>
                  <DeleteClientButton clientId={c.id} clientName={c.name} />
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-xl border border-secondary sm:block">
            <Table>
              <TableCaption className="sr-only">List of clients</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="min-w-[12rem]">Email</TableHead>
                  <TableHead className="w-[1%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="max-w-[240px] break-all text-tertiary">
                      {c.email}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link
                          href={`/dashboard/clients/${c.id}/edit`}
                          className={cx(buttonVariants({ variant: "outline", size: "sm" }))}
                        >
                          Edit
                        </Link>
                        <DeleteClientButton clientId={c.id} clientName={c.name} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </PageShell>
  );
}

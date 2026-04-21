import Link from "next/link";

import { deleteClientAction } from "@/app/actions/clients";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import { requireSession } from "@/lib/require-session";

export default async function ClientsPage() {
  const session = await requireSession();
  const clients = await prisma.client.findMany({
    where: { userId: session.userId },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            People and companies you bill. Used when creating invoices.
          </p>
        </div>
        <Link href="/dashboard/clients/new" className={cn(buttonVariants(), "shrink-0")}>
          Add client
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
          <p className="text-sm text-muted-foreground">No clients yet.</p>
          <Link
            href="/dashboard/clients/new"
            className={cn(buttonVariants({ variant: "link" }), "mt-2")}
          >
            Add your first client
          </Link>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-xl border border-border">
          <Table>
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
                  <TableCell className="max-w-[240px] break-all text-muted-foreground">
                    {c.email}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        href={`/dashboard/clients/${c.id}/edit`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        Edit
                      </Link>
                      <form action={deleteClientAction} className="inline">
                        <input type="hidden" name="id" value={c.id} />
                        <Button type="submit" variant="destructive" size="sm">
                          Delete
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

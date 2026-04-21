import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

function formatMoney(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(d);
}

export default async function DashboardPage() {
  const session = await requireSession();
  const invoices = await prisma.invoice.findMany({
    where: { client: { userId: session.userId } },
    include: { client: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{session.email}</span>
          </p>
        </div>
        <Link href="/invoice/new" className={cn(buttonVariants(), "shrink-0")}>
          New invoice
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clients</CardTitle>
            <CardDescription>Maintain who you bill.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/clients" className={cn(buttonVariants({ variant: "outline" }), "inline-flex")}>
              Manage clients
            </Link>
          </CardContent>
        </Card>
        <Card className="opacity-90">
          <CardHeader>
            <CardTitle className="text-base">Quick add</CardTitle>
            <CardDescription>Jump straight to a new invoice.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/invoice/new" className={cn(buttonVariants({ variant: "secondary" }), "inline-flex")}>
              Create invoice
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mt-10">
        <h2 className="text-base font-medium text-foreground">Invoices</h2>
        {invoices.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
            <Link href="/invoice/new" className={cn(buttonVariants({ variant: "link" }), "mt-2")}>
              Create your first invoice
            </Link>
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="w-[1%] text-right"> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.client.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {inv.title || "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(inv.amount)}</TableCell>
                    <TableCell className="capitalize">{inv.status}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(inv.dueDate)}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/invoice/${inv.id}`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

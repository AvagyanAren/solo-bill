import Link from "next/link";
import { notFound } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
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

type LineItem = { name: string; price: number };

function parseLineItems(json: string): LineItem[] {
  try {
    const data = JSON.parse(json) as unknown;
    if (!Array.isArray(data)) {
      return [];
    }
    return data
      .map((row) => {
        if (!row || typeof row !== "object") {
          return null;
        }
        const name = "name" in row && typeof row.name === "string" ? row.name : "";
        const price = "price" in row && typeof row.price === "number" ? row.price : Number.NaN;
        if (!name || !Number.isFinite(price)) {
          return null;
        }
        return { name, price };
      })
      .filter((x): x is LineItem => x !== null);
  } catch {
    return [];
  }
}

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

type Props = { params: Promise<{ id: string }> };

export default async function InvoiceDetailPage({ params }: Props) {
  const session = await requireSession();
  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: {
      id,
      client: { userId: session.userId },
    },
    include: { client: true },
  });
  if (!invoice) {
    notFound();
  }

  const lineItems = parseLineItems(invoice.lineItemsJson);

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <Link href="/dashboard" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          ← Back to dashboard
        </Link>
      </div>

      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h1 className="text-xl font-semibold text-foreground">{invoice.title || "Invoice"}</h1>
        <span className="text-sm capitalize text-muted-foreground">{invoice.status}</span>
      </div>

      <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Client</dt>
          <dd className="font-medium text-foreground">{invoice.client.name}</dd>
          <dd className="text-muted-foreground">{invoice.client.email}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Due</dt>
          <dd className="font-medium text-foreground">{formatDate(invoice.dueDate)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">Work description</dt>
          <dd className="mt-1 whitespace-pre-wrap text-foreground">{invoice.description}</dd>
        </div>
      </dl>

      {lineItems.length > 0 ? (
        <div className="mt-8 overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(row.price)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-medium">Total</TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatMoney(invoice.amount)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="mt-8 text-sm text-muted-foreground">
          Total: <span className="font-medium text-foreground">{formatMoney(invoice.amount)}</span>
        </p>
      )}
    </div>
  );
}

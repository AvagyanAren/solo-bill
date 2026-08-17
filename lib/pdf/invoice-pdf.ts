import PDFDocument from "pdfkit";

import { formatDate, formatMinorMoney } from "@/lib/format";

export type InvoicePdfLineItem = {
  description: string;
  quantity: number;
  unitAmountMinor: number;
  taxRateBps: number;
  taxMinor: number;
  totalMinor: number;
};

export type InvoicePdfBusiness = {
  displayName?: string | null;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
};

export type InvoicePdfClient = {
  name: string;
  companyName?: string | null;
  contactName?: string | null;
  email: string;
  billingAddress1?: string | null;
  billingAddress2?: string | null;
  billingCity?: string | null;
  billingState?: string | null;
  billingPostalCode?: string | null;
  billingCountry?: string | null;
};

export type InvoicePdfInput = {
  invoiceNumber: string;
  title: string;
  description: string;
  status: string;
  currency: string;
  issueDate: Date;
  dueDate: Date;
  notes?: string | null;
  terms?: string | null;
  subtotalMinor: number;
  taxMinor: number;
  discountMinor: number;
  totalMinor: number;
  business: InvoicePdfBusiness;
  client: InvoicePdfClient;
  lineItems: InvoicePdfLineItem[];
};

function joinAddress(
  parts: Array<string | null | undefined>,
): string {
  return parts.filter((part) => Boolean(part && String(part).trim())).join(", ");
}

function writeWrapped(
  doc: PDFKit.PDFDocument,
  text: string,
  options?: PDFKit.Mixins.TextOptions,
) {
  doc.text(text, options);
}

/**
 * Server-safe invoice PDF renderer (pdfkit / Node streams).
 * Collects the document into a Buffer without touching the filesystem.
 */
export async function renderInvoicePdf(input: InvoicePdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margin: 50,
      info: {
        Title: `${input.invoiceNumber} — ${input.title || "Invoice"}`,
        Author: input.business.displayName || input.business.legalName || "SoloBill",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const businessName =
      input.business.displayName || input.business.legalName || "Your business";
    const clientName = input.client.companyName || input.client.name;

    doc.fontSize(20).fillColor("#111827").text(businessName);
    doc.moveDown(0.25);
    doc.fontSize(10).fillColor("#4B5563");
    if (input.business.email) writeWrapped(doc, input.business.email);
    if (input.business.phone) writeWrapped(doc, input.business.phone);
    const businessAddress = joinAddress([
      input.business.addressLine1,
      input.business.addressLine2,
      input.business.city,
      input.business.state,
      input.business.postalCode,
      input.business.countryCode,
    ]);
    if (businessAddress) writeWrapped(doc, businessAddress);

    doc.moveDown(1);
    doc.fontSize(16).fillColor("#111827").text("INVOICE");
    doc.fontSize(11).fillColor("#111827");
    writeWrapped(doc, `Number: ${input.invoiceNumber}`);
    if (input.title) writeWrapped(doc, `Title: ${input.title}`);
    writeWrapped(doc, `Status: ${input.status}`);
    writeWrapped(doc, `Issue date: ${formatDate(input.issueDate)}`);
    writeWrapped(doc, `Due date: ${formatDate(input.dueDate)}`);

    doc.moveDown(1);
    doc.fontSize(12).fillColor("#111827").text("Bill to");
    doc.fontSize(10).fillColor("#374151");
    writeWrapped(doc, clientName);
    if (input.client.contactName) writeWrapped(doc, input.client.contactName);
    writeWrapped(doc, input.client.email);
    const clientAddress = joinAddress([
      input.client.billingAddress1,
      input.client.billingAddress2,
      input.client.billingCity,
      input.client.billingState,
      input.client.billingPostalCode,
      input.client.billingCountry,
    ]);
    if (clientAddress) writeWrapped(doc, clientAddress);

    if (input.description.trim()) {
      doc.moveDown(1);
      doc.fontSize(12).fillColor("#111827").text("Work description");
      doc.fontSize(10).fillColor("#374151");
      writeWrapped(doc, input.description, { width: 500 });
    }

    doc.moveDown(1);
    doc.fontSize(12).fillColor("#111827").text("Line items");
    doc.moveDown(0.4);

    const colX = { desc: 50, qty: 320, unit: 370, tax: 440, total: 500 };
    doc.fontSize(9).fillColor("#6B7280");
    doc.text("#", colX.desc, doc.y, { continued: false });
    const headerY = doc.y - 11;
    doc.text("Item", colX.desc + 18, headerY);
    doc.text("Qty", colX.qty, headerY, { width: 40, align: "right" });
    doc.text("Unit", colX.unit, headerY, { width: 60, align: "right" });
    doc.text("Tax", colX.tax, headerY, { width: 50, align: "right" });
    doc.text("Total", colX.total, headerY, { width: 60, align: "right" });
    doc
      .moveTo(50, doc.y + 4)
      .lineTo(560, doc.y + 4)
      .strokeColor("#E5E7EB")
      .stroke();
    doc.moveDown(0.6);

    if (input.lineItems.length === 0) {
      doc.fontSize(10).fillColor("#6B7280").text("No line items.");
    } else {
      input.lineItems.forEach((item, index) => {
        const rowTop = doc.y;
        doc.fontSize(10).fillColor("#111827");
        doc.text(String(index + 1), colX.desc, rowTop, { width: 16 });
        doc.text(item.description, colX.desc + 18, rowTop, { width: 240 });
        const afterDescY = doc.y;
        doc.text(String(item.quantity), colX.qty, rowTop, { width: 40, align: "right" });
        doc.text(formatMinorMoney(item.unitAmountMinor, input.currency), colX.unit, rowTop, {
          width: 60,
          align: "right",
        });
        doc.text(`${(item.taxRateBps / 100).toFixed(2)}%`, colX.tax, rowTop, {
          width: 50,
          align: "right",
        });
        doc.text(formatMinorMoney(item.totalMinor, input.currency), colX.total, rowTop, {
          width: 60,
          align: "right",
        });
        doc.y = Math.max(afterDescY, rowTop + 14) + 6;
        if (doc.y > 700) {
          doc.addPage();
        }
      });
    }

    doc.moveDown(0.5);
    doc
      .moveTo(320, doc.y)
      .lineTo(560, doc.y)
      .strokeColor("#E5E7EB")
      .stroke();
    doc.moveDown(0.5);

    const totals = [
      ["Subtotal", formatMinorMoney(input.subtotalMinor, input.currency)],
      ["Tax", formatMinorMoney(input.taxMinor, input.currency)],
      ["Discount", `−${formatMinorMoney(input.discountMinor, input.currency)}`],
      ["Total", formatMinorMoney(input.totalMinor, input.currency)],
    ] as const;

    for (const [label, value] of totals) {
      const y = doc.y;
      const isTotal = label === "Total";
      doc.fontSize(isTotal ? 11 : 10).fillColor("#111827");
      doc.text(label, 320, y, { width: 120, align: "right" });
      doc.text(value, 450, y, { width: 110, align: "right" });
      doc.moveDown(0.35);
    }

    if (input.notes?.trim()) {
      doc.moveDown(1);
      doc.fontSize(12).fillColor("#111827").text("Notes");
      doc.fontSize(10).fillColor("#374151");
      writeWrapped(doc, input.notes.trim(), { width: 500 });
    }

    if (input.terms?.trim()) {
      doc.moveDown(1);
      doc.fontSize(12).fillColor("#111827").text("Terms");
      doc.fontSize(10).fillColor("#374151");
      writeWrapped(doc, input.terms.trim(), { width: 500 });
    }

    doc.end();
  });
}

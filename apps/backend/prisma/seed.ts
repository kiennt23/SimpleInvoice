import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { businessDate } from "../src/domain/business-date";
import { calculateTotals } from "../src/domain/money";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl === undefined || databaseUrl.length === 0) {
  throw new Error("DATABASE_URL is required to seed the database");
}

const reviewer = {
  id: "10000000-0000-4000-8000-000000000001",
  email: process.env.SEED_REVIEWER_EMAIL ?? "reviewer@simpleinvoice.local",
  fullname: "SimpleInvoice Reviewer",
  password: process.env.SEED_REVIEWER_PASSWORD ?? "simpleinvoice-reviewer",
};

type PersistedStatus = "Draft" | "Pending" | "Paid";
type Currency = "AUD" | "USD" | "GBP";
type InvoiceSeed = {
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  customerMobileNumber?: string;
  customerAddress?: string;
  invoiceDate: string;
  dueDate: string;
  currency: Currency;
  status: PersistedStatus;
  itemName: string;
  quantity: number;
  rate: string;
  taxPercent: string;
  discount: string;
};

const customers = [
  ["Aroha Ngata", "aroha@kaurifoods.example", "+64 21 555 0101", "12 Kauri St, Auckland"],
  ["Wei Chen", "wei.chen@harbourtech.example", "+61 412 555 0102", "88 Harbour Rd, Sydney"],
  ["Fatima Al-Sayed", "fatima@gulftrading.example", undefined, undefined],
  ["Liam O'Connor", "liam@docksidebrew.example", "+61 400 555 0104", "5 Dock Lane, Melbourne"],
  ["Sakura Tanaka", "sakura@hanami.example", undefined, "3-1 Hanami Ave, Tokyo"],
  ["Diego Fernandez", "diego@pampaslogistics.example", "+54 911 555 0106", undefined],
] as const;

function dateFrom(base: string, offset: number): string {
  const value = new Date(`${base}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

function cycle<T>(values: readonly [T, ...T[]], index: number): T {
  return values[index % values.length] as T;
}

function buildInvoices(today: string): InvoiceSeed[] {
  const currencies: [Currency, ...Currency[]] = ["AUD", "USD", "GBP"];
  const statuses: [PersistedStatus, ...PersistedStatus[]] = ["Draft", "Pending", "Paid"];
  const itemNames: [string, ...string[]] = [
    "Consulting services",
    "Software licence",
    "Hardware batch",
    "Support retainer",
    "Delivery and freight",
  ];
  const invoices: InvoiceSeed[] = [
    {
      invoiceNumber: "IV1780488206995",
      customerName: "Paul Singapore",
      customerEmail: "paul@singapore-trading.example",
      customerMobileNumber: "+65 8555 0100",
      customerAddress: "1 Raffles Place, Singapore",
      invoiceDate: dateFrom(today, -5),
      dueDate: dateFrom(today, 25),
      currency: "AUD",
      status: "Draft",
      itemName: "Consulting engagement",
      quantity: 3,
      rate: "860.0000",
      taxPercent: "10.00",
      discount: "0.00",
    },
  ];

  for (let index = 0; index < 24; index += 1) {
    const customer = customers[index % customers.length];
    const invoiceOffset = -(70 - index * 2);
    const shouldBePastDue = index % 2 === 0;
    invoices.push({
      invoiceNumber: `INV-2026-${String(1001 + index).padStart(5, "0")}`,
      customerName: customer[0],
      customerEmail: customer[1],
      ...(customer[2] === undefined ? {} : { customerMobileNumber: customer[2] }),
      ...(customer[3] === undefined ? {} : { customerAddress: customer[3] }),
      invoiceDate: dateFrom(today, invoiceOffset),
      dueDate: dateFrom(today, shouldBePastDue ? -1 - (index % 17) : 3 + (index % 23)),
      currency: cycle(currencies, index),
      status: cycle(statuses, index),
      itemName: cycle(itemNames, index),
      quantity: 1 + ((index * 7) % 41),
      rate: `${35 + index * 17}.${String((index * 37) % 100).padStart(2, "0")}00`,
      taxPercent: cycle(["0.00", "10.00", "15.00", "20.00"], index),
      discount: index % 5 === 0 ? "25.00" : "0.00",
    });
  }
  return invoices;
}

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const today = businessDate(() => new Date(), process.env.BUSINESS_TIME_ZONE ?? "UTC");
    const invoices = buildInvoices(today);
    // A fixed, valid salt makes repeated seeds deterministic while never storing plaintext.
    const passwordHash = await bcrypt.hash(reviewer.password, "$2b$12$abcdefghijklmnopqrstuu");

    await prisma.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { email: reviewer.email },
        create: {
          id: reviewer.id,
          email: reviewer.email,
          fullname: reviewer.fullname,
          passwordHash,
        },
        update: { fullname: reviewer.fullname, passwordHash },
      });
      await tx.invoiceItem.deleteMany();
      await tx.invoice.deleteMany();

      for (const [index, invoice] of invoices.entries()) {
        const totals = calculateTotals({
          quantity: invoice.quantity,
          rate: invoice.rate,
          taxPercent: invoice.taxPercent,
          discount: invoice.discount,
          totalPaid: "0.00",
        });
        await tx.invoice.create({
          data: {
            invoiceId: `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
            invoiceNumber: invoice.invoiceNumber,
            customerName: invoice.customerName,
            customerEmail: invoice.customerEmail,
            customerMobileNumber: invoice.customerMobileNumber,
            customerAddress: invoice.customerAddress,
            invoiceDate: new Date(`${invoice.invoiceDate}T00:00:00.000Z`),
            dueDate: new Date(`${invoice.dueDate}T00:00:00.000Z`),
            currency: invoice.currency,
            status: invoice.status,
            taxPercent: new Prisma.Decimal(invoice.taxPercent),
            subtotal: totals.subtotal,
            taxAmount: totals.taxAmount,
            discount: new Prisma.Decimal(invoice.discount),
            totalAmount: totals.totalAmount,
            totalPaid: new Prisma.Decimal("0.00"),
            balanceAmount: totals.balanceAmount,
            items: {
              create: {
                id: `30000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
                name: invoice.itemName,
                quantity: invoice.quantity,
                rate: new Prisma.Decimal(invoice.rate),
              },
            },
          },
        });
      }
    });

    console.log(`Seeded reviewer ${reviewer.email} and ${invoices.length} invoices.`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error("Seed failed", error);
  process.exitCode = 1;
});

import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { InvoiceDetail, InvoiceListRow, ListResponse } from "@simpleinvoice/contracts";
import { APP_CONFIG, type AppConfig } from "../config/app-config";
import { businessDate } from "../domain/business-date";
import { calculateTotals } from "../domain/money";
import { effectiveStatus } from "../domain/status";
import { validateCreatePayload } from "../domain/validate-create-payload";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateInvoiceDto } from "./invoice-detail.dto";
import { InvoicesListQueryDto } from "./invoices-list.dto";
import { InvoicesSqlBoundary } from "./invoices-sql.boundary";

export const CLOCK = Symbol("CLOCK");

@Injectable()
export class InvoicesService {
  constructor(
    private readonly sql: InvoicesSqlBoundary,
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(CLOCK) private readonly clock: () => Date,
  ) {}

  async list(query: InvoicesListQueryDto): Promise<ListResponse> {
    const requestBusinessDate = businessDate(this.clock, this.config.businessTimeZone);
    const result = await this.sql.list({
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
      ordering: query.ordering,
      businessDate: requestBusinessDate,
      ...(query.status === undefined ? {} : { status: query.status }),
      ...(query.keyword === undefined ? {} : { keyword: query.keyword }),
      ...(query.fromDate === undefined ? {} : { fromDate: query.fromDate }),
      ...(query.toDate === undefined ? {} : { toDate: query.toDate }),
    });
    const data: InvoiceListRow[] = result.rows.map((row) => ({
      invoiceId: row.invoiceId,
      invoiceNumber: row.invoiceNumber,
      customerName: row.customerName,
      invoiceDate: row.invoiceDate.toISOString().slice(0, 10),
      dueDate: row.dueDate.toISOString().slice(0, 10),
      totalAmount: row.totalAmount.toFixed(2) as InvoiceListRow["totalAmount"],
      status: row.status,
    }));
    return { data, paging: { page: query.page, pageSize: query.pageSize, total: result.total } };
  }

  async detail(id: string): Promise<InvoiceDetail> {
    const requestBusinessDate = businessDate(this.clock, this.config.businessTimeZone);
    const invoice = await this.prisma.invoice.findUnique({
      where: { invoiceId: id },
      include: { items: { orderBy: { id: "asc" }, take: 1 } },
    });
    if (invoice === null || invoice.items[0] === undefined) {
      throw new NotFoundException("Invoice not found");
    }
    return this.toDetail(invoice, invoice.items[0], requestBusinessDate);
  }

  async create(body: CreateInvoiceDto): Promise<InvoiceDetail> {
    const requestBusinessDate = businessDate(this.clock, this.config.businessTimeZone);
    const validated = validateCreatePayload(body, requestBusinessDate);
    if (!validated.ok) {
      throw new BadRequestException([...validated.errors]);
    }
    const input = validated.normalized;
    const totals = calculateTotals({
      quantity: input.item.quantity,
      rate: input.item.rate,
      taxPercent: input.taxPercent,
      discount: input.discount,
    });
    try {
      const invoice = await this.prisma.$transaction((tx) =>
        tx.invoice.create({
          data: {
            invoiceNumber: input.invoiceNumber,
            customerName: input.customer.fullname,
            customerEmail: input.customer.email,
            ...(input.customer.mobileNumber === undefined
              ? {}
              : { customerMobileNumber: input.customer.mobileNumber }),
            ...(input.customer.address === undefined
              ? {}
              : { customerAddress: input.customer.address }),
            invoiceDate: new Date(`${input.invoiceDate}T00:00:00.000Z`),
            dueDate: new Date(`${input.dueDate}T00:00:00.000Z`),
            currency: input.currency,
            status: "Draft",
            taxPercent: new Prisma.Decimal(input.taxPercent),
            subtotal: totals.subtotal,
            taxAmount: totals.taxAmount,
            discount: new Prisma.Decimal(input.discount),
            totalAmount: totals.totalAmount,
            totalPaid: new Prisma.Decimal("0.00"),
            balanceAmount: totals.balanceAmount,
            items: {
              create: { name: input.item.name, quantity: input.item.quantity, rate: input.item.rate },
            },
          },
          include: { items: true },
        }),
      );
      const item = invoice.items[0];
      if (item === undefined) throw new Error("Atomic invoice creation returned no item");
      return this.toDetail(invoice, item, requestBusinessDate);
    } catch (error: unknown) {
      if (this.isUniqueInvoiceNumberError(error)) {
        throw new ConflictException("Invoice number already exists");
      }
      throw error;
    }
  }

  private toDetail(
    invoice: {
      invoiceId: string; invoiceNumber: string; customerName: string; customerEmail: string;
      customerMobileNumber: string | null; customerAddress: string | null; invoiceDate: Date;
      dueDate: Date; currency: string; status: string; taxPercent: Prisma.Decimal;
      subtotal: Prisma.Decimal; taxAmount: Prisma.Decimal; discount: Prisma.Decimal;
      totalAmount: Prisma.Decimal; totalPaid: Prisma.Decimal; balanceAmount: Prisma.Decimal;
    },
    item: { name: string; quantity: number; rate: Prisma.Decimal },
    requestBusinessDate: string,
  ): InvoiceDetail {
    const date = (value: Date) => value.toISOString().slice(0, 10);
    const customer = {
      fullname: invoice.customerName,
      email: invoice.customerEmail,
      ...(invoice.customerMobileNumber === null ? {} : { mobileNumber: invoice.customerMobileNumber }),
      ...(invoice.customerAddress === null ? {} : { address: invoice.customerAddress }),
    };
    return {
      invoiceId: invoice.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      invoiceDate: date(invoice.invoiceDate),
      dueDate: date(invoice.dueDate),
      totalAmount: invoice.totalAmount.toFixed(2) as InvoiceDetail["totalAmount"],
      status: effectiveStatus(invoice.status as "Draft" | "Pending" | "Paid", date(invoice.dueDate), requestBusinessDate),
      currency: invoice.currency as InvoiceDetail["currency"],
      taxPercent: invoice.taxPercent.toFixed(2) as InvoiceDetail["taxPercent"],
      customer,
      item: { name: item.name, quantity: item.quantity, rate: item.rate.toFixed(4) as InvoiceDetail["item"]["rate"] },
      subtotal: invoice.subtotal.toFixed(2) as InvoiceDetail["subtotal"],
      taxAmount: invoice.taxAmount.toFixed(2) as InvoiceDetail["taxAmount"],
      discount: invoice.discount.toFixed(2) as InvoiceDetail["discount"],
      totalPaid: invoice.totalPaid.toFixed(2) as InvoiceDetail["totalPaid"],
      balanceAmount: invoice.balanceAmount.toFixed(2) as InvoiceDetail["balanceAmount"],
    };
  }

  private isUniqueInvoiceNumberError(error: unknown): boolean {
    if (typeof error !== "object" || error === null || !("code" in error) || error.code !== "P2002") return false;
    const meta = "meta" in error && typeof error.meta === "object" && error.meta !== null ? error.meta : undefined;
    const target = meta !== undefined && "target" in meta ? meta.target : undefined;
    return target === undefined || String(target).includes("invoiceNumber");
  }
}

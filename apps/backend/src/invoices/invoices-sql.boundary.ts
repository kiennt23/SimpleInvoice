import { Injectable } from "@nestjs/common";
import type { InvoiceStatus, SortField, SortOrder } from "@simpleinvoice/contracts";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface InvoiceListSqlInput {
  page: number;
  pageSize: number;
  sortBy: SortField;
  ordering: SortOrder;
  status?: InvoiceStatus;
  keyword?: string;
  fromDate?: string;
  toDate?: string;
  businessDate: string;
}

interface SqlRow {
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  invoiceDate: Date;
  dueDate: Date;
  totalAmount: Prisma.Decimal;
  status: InvoiceStatus;
}

interface CountRow {
  total: bigint;
}

@Injectable()
export class InvoicesSqlBoundary {
  constructor(private readonly prisma: PrismaService) {}

  async list(input: InvoiceListSqlInput): Promise<{ rows: SqlRow[]; total: number }> {
    const where = this.where(input);
    const sortColumn: Record<SortField, Prisma.Sql> = {
      invoiceDate: Prisma.sql`i."invoiceDate"`,
      dueDate: Prisma.sql`i."dueDate"`,
      totalAmount: Prisma.sql`i."totalAmount"`,
    };
    const direction = input.ordering === "ASC" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
    const effectiveStatus = Prisma.sql`CASE WHEN i.status <> 'Paid' AND i."dueDate" < ${input.businessDate}::date THEN 'Overdue' ELSE i.status END`;
    return this.prisma.$transaction(
      async (transaction) => {
        const rows = await transaction.$queryRaw<SqlRow[]>(Prisma.sql`
          SELECT i."invoiceId", i."invoiceNumber", i."customerName", i."invoiceDate",
                 i."dueDate", i."totalAmount", ${effectiveStatus} AS status
          FROM "Invoice" i
          ${where}
          ORDER BY ${sortColumn[input.sortBy]} ${direction}, i."invoiceId" ${direction}
          LIMIT ${input.pageSize} OFFSET ${(input.page - 1) * input.pageSize}
        `);
        const counts = await transaction.$queryRaw<CountRow[]>(Prisma.sql`
          SELECT COUNT(*)::bigint AS total FROM "Invoice" i ${where}
        `);
        return { rows, total: Number(counts[0]?.total ?? 0n) };
      },
      { isolationLevel: "RepeatableRead" },
    );
  }

  private where(input: InvoiceListSqlInput): Prisma.Sql {
    const predicates: Prisma.Sql[] = [];
    if (input.keyword !== undefined) {
      const pattern = `%${input.keyword.replace(/[\\%_]/g, "\\$&")}%`;
      predicates.push(
        Prisma.sql`(i."invoiceNumber" ILIKE ${pattern} ESCAPE '\\' OR i."customerName" ILIKE ${pattern} ESCAPE '\\')`,
      );
    }
    if (input.fromDate !== undefined)
      predicates.push(Prisma.sql`i."invoiceDate" >= ${input.fromDate}::date`);
    if (input.toDate !== undefined)
      predicates.push(Prisma.sql`i."invoiceDate" <= ${input.toDate}::date`);
    if (input.status === "Overdue") {
      predicates.push(Prisma.sql`i.status <> 'Paid' AND i."dueDate" < ${input.businessDate}::date`);
    } else if (input.status === "Paid") {
      predicates.push(Prisma.sql`i.status = 'Paid'`);
    } else if (input.status !== undefined) {
      predicates.push(
        Prisma.sql`i.status = ${input.status} AND i."dueDate" >= ${input.businessDate}::date`,
      );
    }
    return predicates.length === 0
      ? Prisma.empty
      : Prisma.sql`WHERE ${Prisma.join(predicates, " AND ")}`;
  }
}

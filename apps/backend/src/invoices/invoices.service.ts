import { Inject, Injectable } from "@nestjs/common";
import type { InvoiceListRow, ListResponse } from "@simpleinvoice/contracts";
import { APP_CONFIG, type AppConfig } from "../config/app-config";
import { businessDate } from "../domain/business-date";
import { InvoicesListQueryDto } from "./invoices-list.dto";
import { InvoicesSqlBoundary } from "./invoices-sql.boundary";

export const CLOCK = Symbol("CLOCK");

@Injectable()
export class InvoicesService {
  constructor(
    private readonly sql: InvoicesSqlBoundary,
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
}

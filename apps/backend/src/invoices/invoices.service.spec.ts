import { Prisma } from "../generated/prisma/client";
import type { AppConfig } from "../config/app-config";
import { InvoicesService } from "./invoices.service";
import type { InvoicesSqlBoundary } from "./invoices-sql.boundary";

describe("InvoicesService", () => {
  it("computes one business date, passes defaults, and maps the exact transport envelope", async () => {
    const clock = jest.fn(() => new Date("2026-01-02T00:30:00Z"));
    const sql = {
      list: jest.fn().mockResolvedValue({
        total: 17,
        rows: [
          {
            invoiceId: "00000000-0000-4000-8000-000000000001",
            invoiceNumber: "INV-1",
            customerName: "Customer",
            invoiceDate: new Date("2026-01-01T00:00:00.000Z"),
            dueDate: new Date("2026-01-02T00:00:00.000Z"),
            totalAmount: new Prisma.Decimal("4.5"),
            status: "Pending",
          },
        ],
      }),
    };
    const config = { businessTimeZone: "Pacific/Honolulu" } as AppConfig;
    const service = new InvoicesService(
      sql as unknown as InvoicesSqlBoundary,
      {} as never,
      config,
      clock,
    );

    await expect(
      service.list({ page: 2, pageSize: 1, sortBy: "invoiceDate", ordering: "DESC" }),
    ).resolves.toEqual({
      data: [
        {
          invoiceId: "00000000-0000-4000-8000-000000000001",
          invoiceNumber: "INV-1",
          customerName: "Customer",
          invoiceDate: "2026-01-01",
          dueDate: "2026-01-02",
          totalAmount: "4.50",
          status: "Pending",
        },
      ],
      paging: { page: 2, pageSize: 1, total: 17 },
    });
    expect(clock).toHaveBeenCalledTimes(1);
    expect(sql.list).toHaveBeenCalledWith(expect.objectContaining({ businessDate: "2026-01-01" }));
  });
});

import { Module } from "@nestjs/common";
import { InvoicesController } from "./invoices.controller";
import { InvoicesService, CLOCK } from "./invoices.service";
import { InvoicesSqlBoundary } from "./invoices-sql.boundary";

@Module({
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicesSqlBoundary, { provide: CLOCK, useValue: () => new Date() }],
})
export class InvoicesModule {}

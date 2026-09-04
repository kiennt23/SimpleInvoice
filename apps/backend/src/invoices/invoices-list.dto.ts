import { Transform } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

const ISO_DATE = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;

function integerQuery({ value }: { value: unknown }): unknown {
  return typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
}

export class InvoicesListQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Transform(integerQuery)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @Transform(integerQuery)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 10;

  @ApiPropertyOptional({ enum: ["invoiceDate", "dueDate", "totalAmount"], default: "invoiceDate" })
  @IsIn(["invoiceDate", "dueDate", "totalAmount"])
  sortBy: "invoiceDate" | "dueDate" | "totalAmount" = "invoiceDate";

  @ApiPropertyOptional({ enum: ["ASC", "DESC"], default: "DESC" })
  @IsIn(["ASC", "DESC"])
  ordering: "ASC" | "DESC" = "DESC";

  @ApiPropertyOptional({ enum: ["Draft", "Pending", "Paid", "Overdue"] })
  @IsOptional()
  @IsIn(["Draft", "Pending", "Paid", "Overdue"])
  status?: "Draft" | "Pending" | "Paid" | "Overdue";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ format: "date" })
  @IsOptional()
  @IsDateString({ strict: true, strictSeparator: true })
  @Matches(ISO_DATE, { message: "fromDate must be a YYYY-MM-DD date" })
  fromDate?: string;

  @ApiPropertyOptional({ format: "date" })
  @IsOptional()
  @IsDateString({ strict: true, strictSeparator: true })
  @Matches(ISO_DATE, { message: "toDate must be a YYYY-MM-DD date" })
  toDate?: string;
}

export class InvoiceListRowDto {
  @ApiProperty({ format: "uuid" }) invoiceId!: string;
  @ApiProperty() invoiceNumber!: string;
  @ApiProperty() customerName!: string;
  @ApiProperty({ format: "date" }) invoiceDate!: string;
  @ApiProperty({ format: "date" }) dueDate!: string;
  @ApiProperty({ example: "123.45" }) totalAmount!: string;
  @ApiProperty({ enum: ["Draft", "Pending", "Paid", "Overdue"] }) status!: string;
}

export class InvoicePagingDto {
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
}

export class InvoicesListResponseDto {
  @ApiProperty({ type: [InvoiceListRowDto] }) data!: InvoiceListRowDto[];
  @ApiProperty({ type: InvoicePagingDto }) paging!: InvoicePagingDto;
}

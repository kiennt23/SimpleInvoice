import { Type } from "class-transformer";
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

const DATE = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;
const DECIMAL = /^\d+(\.\d+)?$/;

export class CreateCustomerDto {
  @ApiProperty() @IsString() @IsNotEmpty() fullname!: string;
  @ApiProperty({ format: "email" }) @IsEmail() email!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mobileNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
}

export class CreateItemDto {
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiProperty({ minimum: 1, maximum: 1000000 })
  @IsInt()
  @Min(1)
  @Max(1000000)
  quantity!: number;
  @ApiProperty({ example: "12.3456", pattern: DECIMAL.source })
  @IsString()
  @Matches(DECIMAL)
  rate!: string;
}

export class CreateInvoiceDto {
  @ApiProperty({ type: CreateCustomerDto })
  @IsObject()
  @ValidateNested()
  @Type(() => CreateCustomerDto)
  customer!: CreateCustomerDto;

  @ApiProperty() @IsString() @IsNotEmpty() invoiceNumber!: string;
  @ApiProperty({ format: "date" }) @IsString() @Matches(DATE) invoiceDate!: string;
  @ApiProperty({ format: "date" }) @IsString() @Matches(DATE) dueDate!: string;
  @ApiProperty({ enum: ["AUD", "USD", "GBP"] })
  @IsIn(["AUD", "USD", "GBP"])
  currency!: string;

  @ApiProperty({ type: CreateItemDto })
  @IsObject()
  @ValidateNested()
  @Type(() => CreateItemDto)
  item!: CreateItemDto;

  @ApiPropertyOptional({ default: "10.00", example: "10.00" })
  @IsOptional()
  @IsString()
  @Matches(DECIMAL)
  taxPercent?: string;
  @ApiPropertyOptional({ default: "0.00", example: "0.00" })
  @IsOptional()
  @IsString()
  @Matches(DECIMAL)
  discount?: string;
}

export class CustomerDetailDto {
  @ApiProperty() fullname!: string;
  @ApiProperty({ format: "email" }) email!: string;
  @ApiPropertyOptional() mobileNumber?: string;
  @ApiPropertyOptional() address?: string;
}

export class ItemDetailDto {
  @ApiProperty() name!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty({ example: "12.3400" }) rate!: string;
}

export class InvoiceDetailDto {
  @ApiProperty({ format: "uuid" }) invoiceId!: string;
  @ApiProperty() invoiceNumber!: string;
  @ApiProperty() customerName!: string;
  @ApiProperty({ format: "date" }) invoiceDate!: string;
  @ApiProperty({ format: "date" }) dueDate!: string;
  @ApiProperty({ example: "13.57" }) totalAmount!: string;
  @ApiProperty({ enum: ["Draft", "Pending", "Paid", "Overdue"] }) status!: string;
  @ApiProperty({ enum: ["AUD", "USD", "GBP"] }) currency!: string;
  @ApiProperty({ example: "10.00" }) taxPercent!: string;
  @ApiProperty({ type: CustomerDetailDto }) customer!: CustomerDetailDto;
  @ApiProperty({ type: ItemDetailDto }) item!: ItemDetailDto;
  @ApiProperty({ example: "12.34" }) subtotal!: string;
  @ApiProperty({ example: "1.23" }) taxAmount!: string;
  @ApiProperty({ example: "0.00" }) discount!: string;
  @ApiProperty({ example: "0.00" }) totalPaid!: string;
  @ApiProperty({ example: "13.57" }) balanceAmount!: string;
}

import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { ListResponse } from "@simpleinvoice/contracts";
import { ApiErrorDto, ApiValidationErrorDto } from "../auth/auth-response.dto";
import { CreateInvoiceDto, InvoiceDetailDto } from "./invoice-detail.dto";
import { InvoicesListQueryDto, InvoicesListResponseDto } from "./invoices-list.dto";
import { InvoicesService } from "./invoices.service";

@ApiTags("invoices")
@Controller("invoices")
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: "Search, filter, sort, and page invoices" })
  @ApiOkResponse({ type: InvoicesListResponseDto })
  @ApiBadRequestResponse({ description: "Invalid query", type: ApiValidationErrorDto })
  @ApiUnauthorizedResponse({ description: "Authentication required", type: ApiErrorDto })
  list(@Query() query: InvoicesListQueryDto): Promise<ListResponse> {
    return this.invoices.list(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get complete invoice details" })
  @ApiOkResponse({ type: InvoiceDetailDto })
  @ApiBadRequestResponse({ description: "Invalid invoice id", type: ApiValidationErrorDto })
  @ApiNotFoundResponse({ description: "Invoice not found", type: ApiErrorDto })
  @ApiUnauthorizedResponse({ description: "Authentication required", type: ApiErrorDto })
  detail(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.invoices.detail(id);
  }

  @Post()
  @ApiOperation({ summary: "Create an invoice and its single line item atomically" })
  @ApiBody({ type: CreateInvoiceDto })
  @ApiCreatedResponse({ type: InvoiceDetailDto })
  @ApiBadRequestResponse({ description: "Invalid invoice", type: ApiValidationErrorDto })
  @ApiUnauthorizedResponse({ description: "Authentication required", type: ApiErrorDto })
  @ApiForbiddenResponse({ description: "Invalid request origin", type: ApiErrorDto })
  @ApiConflictResponse({ description: "Invoice number already exists", type: ApiErrorDto })
  create(@Body() body: CreateInvoiceDto) {
    return this.invoices.create(body);
  }
}

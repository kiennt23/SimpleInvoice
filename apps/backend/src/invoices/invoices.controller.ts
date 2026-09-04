import { Controller, Get, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { ListResponse } from "@simpleinvoice/contracts";
import { ApiErrorDto } from "../auth/auth-response.dto";
import { InvoicesListQueryDto, InvoicesListResponseDto } from "./invoices-list.dto";
import { InvoicesService } from "./invoices.service";

@ApiTags("invoices")
@Controller("invoices")
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: "Search, filter, sort, and page invoices" })
  @ApiOkResponse({ type: InvoicesListResponseDto })
  @ApiBadRequestResponse({ description: "Invalid query", type: ApiErrorDto })
  @ApiUnauthorizedResponse({ description: "Authentication required", type: ApiErrorDto })
  list(@Query() query: InvoicesListQueryDto): Promise<ListResponse> {
    return this.invoices.list(query);
  }
}

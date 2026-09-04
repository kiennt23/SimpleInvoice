import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { Response } from "express";
import { APP_CONFIG, type AppConfig } from "../config/app-config";
import { Inject } from "@nestjs/common";
import { AuthService } from "./auth.service";
import type { AuthenticatedRequest, AuthUser } from "./auth.types";
import { LoginDto } from "./login.dto";
import { Public } from "./public.decorator";
import { ApiErrorDto, AuthResponseDto } from "./auth-response.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Public()
  @Post("login")
  @HttpCode(200)
  @ApiOperation({ summary: "Authenticate and create a cookie session" })
  @ApiOkResponse({
    description: "Authenticated user; sid is issued in Set-Cookie",
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid request body" })
  @ApiUnauthorizedResponse({ description: "Invalid email or password", type: ApiErrorDto })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: AuthUser }> {
    const result = await this.auth.authenticate(dto.email, dto.password);
    response.cookie("sid", result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: this.config.appOrigin?.startsWith("https://") ?? false,
      maxAge: this.config.jwtExpiresInSeconds * 1000,
      path: "/",
    });
    return { user: result.user };
  }

  @Get("me")
  @ApiOperation({ summary: "Return the authenticated user" })
  @ApiOkResponse({ description: "Current user", type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: "Authentication required", type: ApiErrorDto })
  me(@Req() request: AuthenticatedRequest): { user: AuthUser } {
    if (!request.user) throw new UnauthorizedException("Authentication required");
    return { user: request.user };
  }
}

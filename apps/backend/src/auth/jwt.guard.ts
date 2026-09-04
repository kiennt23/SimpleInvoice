import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import jwt from "jsonwebtoken";
import { Inject } from "@nestjs/common";
import { APP_CONFIG, type AppConfig } from "../config/app-config";
import { AuthService } from "./auth.service";
import type { AuthenticatedRequest } from "./auth.types";
import { IS_PUBLIC_KEY } from "./public.decorator";

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      return true;
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.readCookie(request.headers.cookie, "sid");
    if (!token) throw new UnauthorizedException("Authentication required");
    try {
      const payload = jwt.verify(token, this.config.jwtSecret);
      if (typeof payload === "string" || typeof payload.sub !== "string")
        throw new Error("Invalid token");
      const user = await this.auth.findUserById(payload.sub);
      if (!user) throw new Error("Unknown user");
      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException("Authentication required");
    }
  }

  private readCookie(header: string | undefined, name: string): string | undefined {
    return header
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`))
      ?.slice(name.length + 1);
  }
}

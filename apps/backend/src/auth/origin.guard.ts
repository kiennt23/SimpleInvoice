import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { APP_CONFIG, type AppConfig } from "../config/app-config";
import type { AuthenticatedRequest } from "./auth.types";
import { IS_PUBLIC_KEY } from "./public.decorator";

@Injectable()
export class OriginGuard implements CanActivate {
  private readonly unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
  constructor(
    private readonly reflector: Reflector,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!this.unsafeMethods.has(request.method)) return true;
    if (!request.user || request.headers.origin !== this.config.appOrigin) {
      throw new ForbiddenException("Invalid request origin");
    }
    return true;
  }
}

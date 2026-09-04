import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { APP_CONFIG, type AppConfig } from "../config/app-config";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthUser } from "./auth.types";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async authenticate(email: string, password: string): Promise<{ user: AuthUser; token: string }> {
    const record = await this.prisma.user.findUnique({ where: { email } });
    if (!record || !(await bcrypt.compare(password, record.passwordHash))) {
      throw new UnauthorizedException("Invalid email or password");
    }
    const user = { id: record.id, email: record.email, fullname: record.fullname };
    const token = jwt.sign({ sub: user.id }, this.config.jwtSecret, {
      expiresIn: this.config.jwtExpiresInSeconds,
    });
    return { user, token };
  }

  async findUserById(id: string): Promise<AuthUser | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, fullname: true },
    });
  }
}

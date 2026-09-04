import { Module } from "@nestjs/common";
import { APP_FILTER, APP_PIPE } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { HealthController } from "./health/health.controller";
import { ConfigModule } from "./config/config.module";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { JwtGuard } from "./auth/jwt.guard";
import { OriginGuard } from "./auth/origin.guard";

@Module({
  imports: [ConfigModule, PrismaModule, AuthModule],
  controllers: [HealthController],
  providers: [
    { provide: APP_PIPE, useValue: new ValidationPipe({ whitelist: true, transform: true }) },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: "APP_GUARD", useClass: JwtGuard },
    { provide: "APP_GUARD", useClass: OriginGuard },
  ],
})
export class AppModule {}

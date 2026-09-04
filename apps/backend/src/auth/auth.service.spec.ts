import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import type { AppConfig } from "../config/app-config";
import type { PrismaService } from "../prisma/prisma.service";

describe("AuthService", () => {
  const config: AppConfig = {
    databaseUrl: "postgresql://unused",
    jwtSecret: "unit-test-secret",
    jwtExpiresInSeconds: 60,
    businessTimeZone: "UTC",
    appOrigin: "http://localhost:8080",
    port: 3000,
  };

  it("compares the hash and signs a subject-only session identity", async () => {
    const user = {
      id: "58ee62b1-21d6-45bb-a7dd-7862893bffdf",
      email: "person@example.com",
      fullname: "Test Person",
      passwordHash: await bcrypt.hash("correct horse", 4),
      createdAt: new Date(),
    };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(user) },
    } as unknown as PrismaService;
    const result = await new AuthService(prisma, config).authenticate(user.email, "correct horse");
    expect(result.user).toEqual({ id: user.id, email: user.email, fullname: user.fullname });
    expect(jwt.verify(result.token, config.jwtSecret)).toMatchObject({ sub: user.id });
  });

  it("returns the same generic 401 for unknown users and wrong passwords", async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    await expect(
      new AuthService(prisma, config).authenticate("nobody@example.com", "wrong"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import bcrypt from "bcryptjs";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { AuthFixtureController } from "./auth-fixture.controller";

process.env["JWT_SECRET"] = "auth-e2e-secret-at-least-long-enough";
process.env["JWT_EXPIRES_IN_SECONDS"] = "3600";
process.env["APP_ORIGIN"] = "http://localhost:8080";

describe("cookie authentication (e2e, PostgreSQL)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const fixture = {
    email: "auth-fixture@example.com",
    password: "fixture-password",
    fullname: "Auth Fixture",
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [AuthFixtureController],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.user.deleteMany({ where: { email: fixture.email } });
    await prisma.user.create({
      data: {
        email: fixture.email,
        fullname: fixture.fullname,
        passwordHash: await bcrypt.hash(fixture.password, 4),
      },
    });
  });

  afterAll(async () => {
    if (prisma) await prisma.user.deleteMany({ where: { email: fixture.email } });
    if (app) await app.close();
  });

  it("logs in, issues hardened cookie, and restores /auth/me", async () => {
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: fixture.email, password: fixture.password })
      .expect(200);
    expect(login.body).toEqual({
      user: expect.objectContaining({ email: fixture.email, fullname: fixture.fullname }),
    });
    const cookie = login.headers["set-cookie"] as unknown as string[];
    expect(cookie[0]).toContain("sid=");
    expect(cookie[0]).toContain("HttpOnly");
    expect(cookie[0]).toContain("SameSite=Lax");
    expect(cookie[0]).toContain("Max-Age=3600");
    await request(app.getHttpServer())
      .get("/auth/me")
      .set("Cookie", cookie)
      .expect(200, login.body);
  });

  it("rejects absent, tampered, and invalid credentials with exact errors and no cookie", async () => {
    await request(app.getHttpServer()).get("/auth/me").expect(401, {
      statusCode: 401,
      error: "Unauthorized",
      message: "Authentication required",
    });
    await request(app.getHttpServer()).get("/auth/me").set("Cookie", "sid=tampered").expect(401);
    const response = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: fixture.email, password: "wrong" })
      .expect(401);
    expect(response.body).toEqual({
      statusCode: 401,
      error: "Unauthorized",
      message: "Invalid email or password",
    });
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("runs authentication before Origin enforcement and exempts safe methods", async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post("/auth/login")
      .send({ email: fixture.email, password: fixture.password })
      .expect(200);
    await agent.get("/auth-fixture").expect(200, { ok: true });
    await agent
      .post("/auth-fixture")
      .expect(403, { statusCode: 403, error: "Forbidden", message: "Invalid request origin" });
    await agent.post("/auth-fixture").set("Origin", "http://evil.example").expect(403);
    await agent
      .post("/auth-fixture")
      .set("Origin", "http://localhost:8080")
      .expect(201, { ok: true });
    await request(app.getHttpServer())
      .post("/auth-fixture")
      .set("Origin", "http://evil.example")
      .expect(401);
  });
});

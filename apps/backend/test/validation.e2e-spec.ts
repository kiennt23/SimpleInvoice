import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { FixtureController } from "./fixture.controller";

// Valid env for the boot-time config boundary; no real database is needed
// for the ValidationPipe contract, so PrismaService is overridden below.
process.env["DATABASE_URL"] = "postgresql://postgres:pw@localhost:5432/postgres";
process.env["JWT_SECRET"] = "e2e-test-secret";

describe("ValidationPipe error contract (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [FixtureController],
    })
      .overrideProvider(PrismaService)
      .useValue({ $connect: jest.fn(), $disconnect: jest.fn() })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns the exact API-006 shape when the DTO is invalid", async () => {
    const response = await request(app.getHttpServer())
      .post("/fixture")
      .send({ name: "", quantity: "not-a-number", intruder: true })
      .expect(400);

    expect(response.body).toEqual({
      statusCode: 400,
      error: "Bad Request",
      message: expect.arrayContaining([expect.any(String)]),
    });
    expect(Array.isArray(response.body.message)).toBe(true);
    expect(response.body.message.length).toBeGreaterThan(0);
  });

  it("accepts a valid payload through the transform path", async () => {
    const response = await request(app.getHttpServer())
      .post("/fixture")
      .send({ name: "widget", quantity: 2, intruder: true })
      .expect(201);

    expect(response.body).toEqual({ received: { name: "widget", quantity: 2 } });
  });
});

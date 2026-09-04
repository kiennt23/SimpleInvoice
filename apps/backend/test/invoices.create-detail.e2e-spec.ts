import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import bcrypt from "bcryptjs";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { CLOCK } from "../src/invoices/invoices.service";
import { PrismaService } from "../src/prisma/prisma.service";

process.env["JWT_SECRET"] = "invoice-create-e2e-secret-long-enough";
process.env["JWT_EXPIRES_IN_SECONDS"] = "3600";
process.env["BUSINESS_TIME_ZONE"] = "UTC";
process.env["APP_ORIGIN"] = "http://localhost:8080";

describe("invoice create and detail (e2e, PostgreSQL)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string[];
  const prefix = "TODO11-E2E-";
  const email = "todo11-invoices@example.com";

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CLOCK)
      .useValue(() => new Date("2026-06-15T12:00:00Z"))
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.invoiceItem.deleteMany({
      where: { invoice: { invoiceNumber: { startsWith: prefix } } },
    });
    await prisma.invoice.deleteMany({ where: { invoiceNumber: { startsWith: prefix } } });
    await prisma.user.deleteMany({ where: { email } });
    await prisma.user.create({
      data: { email, fullname: "Create Tester", passwordHash: await bcrypt.hash("password", 4) },
    });
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email, password: "password" })
      .expect(200);
    cookie = login.headers["set-cookie"] as unknown as string[];
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.invoiceItem.deleteMany({
        where: { invoice: { invoiceNumber: { startsWith: prefix } } },
      });
      await prisma.invoice.deleteMany({ where: { invoiceNumber: { startsWith: prefix } } });
      await prisma.user.deleteMany({ where: { email } });
    }
    if (app) await app.close();
  });

  it("creates one item, ignores client totals, and returns exact detail/list values", async () => {
    const payload = validPayload(`${prefix}VALID`);
    const created = await request(app.getHttpServer())
      .post("/invoices")
      .set("Cookie", cookie)
      .set("Origin", "http://localhost:8080")
      .send({ ...payload, totalAmount: "0.01", status: "Paid" })
      .expect(201);
    expect(created.body).toEqual({
      invoiceId: expect.any(String),
      invoiceNumber: `${prefix}VALID`,
      customerName: "Ada Lovelace",
      invoiceDate: "2026-06-01",
      dueDate: "2026-06-15",
      totalAmount: "30.12",
      status: "Draft",
      currency: "GBP",
      taxPercent: "10.00",
      customer: { fullname: "Ada Lovelace", email: "ada@example.com" },
      item: { name: "Consulting", quantity: 3, rate: "10.0050" },
      subtotal: "30.02",
      taxAmount: "3.00",
      discount: "2.90",
      totalPaid: "0.00",
      balanceAmount: "30.12",
    });
    const detail = await request(app.getHttpServer())
      .get(`/invoices/${created.body.invoiceId as string}`)
      .set("Cookie", cookie)
      .expect(200);
    expect(detail.body).toEqual(created.body);
    const list = await request(app.getHttpServer())
      .get(`/invoices?keyword=${prefix}VALID`)
      .set("Cookie", cookie)
      .expect(200);
    expect(list.body.data[0]).toEqual({
      invoiceId: created.body.invoiceId,
      invoiceNumber: `${prefix}VALID`,
      customerName: "Ada Lovelace",
      invoiceDate: "2026-06-01",
      dueDate: "2026-06-15",
      totalAmount: "30.12",
      status: "Draft",
    });
    const stored = await prisma.invoice.findUnique({
      where: { invoiceId: created.body.invoiceId },
    });
    expect(stored?.status).toBe("Draft");
  });

  it("maps duplicate races to exact 409 and missing detail to exact 404", async () => {
    const duplicate = await request(app.getHttpServer())
      .post("/invoices")
      .set("Cookie", cookie)
      .set("Origin", "http://localhost:8080")
      .send(validPayload(`${prefix}VALID`))
      .expect(409);
    expect(duplicate.body).toEqual({
      statusCode: 409,
      error: "Conflict",
      message: "Invoice number already exists",
    });
    const missing = await request(app.getHttpServer())
      .get("/invoices/00000000-0000-4000-8000-999999999999")
      .set("Cookie", cookie)
      .expect(404);
    expect(missing.body).toEqual({
      statusCode: 404,
      error: "Not Found",
      message: "Invoice not found",
    });
  });

  it("rejects an earlier due date and an array/two-item payload", async () => {
    for (const payload of [
      { ...validPayload(`${prefix}DATE`), dueDate: "2026-05-31" },
      { ...validPayload(`${prefix}ITEMS`), item: [validPayload("x").item, validPayload("y").item] },
    ]) {
      const result = await request(app.getHttpServer())
        .post("/invoices")
        .set("Cookie", cookie)
        .set("Origin", "http://localhost:8080")
        .send(payload)
        .expect(400);
      expect(result.body).toEqual({
        statusCode: 400,
        error: "Bad Request",
        message: expect.any(Array),
      });
    }
  });

  it("publishes create/detail/list paths and their schemas in Swagger", () => {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
    expect(document.paths["/invoices"]?.get).toBeDefined();
    expect(document.paths["/invoices"]?.post?.responses["201"]).toBeDefined();
    expect(document.paths["/invoices/{id}"]?.get?.responses["200"]).toBeDefined();
    expect(document.components?.schemas?.["CreateInvoiceDto"]).toBeDefined();
    expect(document.components?.schemas?.["InvoiceDetailDto"]).toBeDefined();
  });
});

function validPayload(invoiceNumber: string) {
  return {
    customer: { fullname: "Ada Lovelace", email: "ada@example.com" },
    invoiceNumber,
    invoiceDate: "2026-06-01",
    dueDate: "2026-06-15",
    currency: "GBP",
    item: { name: "Consulting", quantity: 3, rate: "10.005" },
    taxPercent: "10",
    discount: "2.90",
  };
}

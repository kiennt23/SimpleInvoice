import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import bcrypt from "bcryptjs";
import { Client } from "pg";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { CLOCK } from "../src/invoices/invoices.service";

process.env["JWT_SECRET"] = "invoice-list-e2e-secret-long-enough";
process.env["JWT_EXPIRES_IN_SECONDS"] = "3600";
process.env["BUSINESS_TIME_ZONE"] = "UTC";
process.env["APP_ORIGIN"] = "http://localhost:8080";

describe("GET /invoices (e2e, PostgreSQL)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string[];
  const prefix = "TODO10-E2E-";
  const email = "todo10-invoices@example.com";
  const fixedIds = [
    "00000000-0000-4000-8000-000000000001",
    "00000000-0000-4000-8000-000000000002",
    "00000000-0000-4000-8000-000000000003",
    "00000000-0000-4000-8000-000000000004",
    "00000000-0000-4000-8000-000000000005",
  ] as const;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CLOCK)
      .useValue(() => new Date("2026-06-15T12:00:00Z"))
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.invoice.deleteMany({ where: { invoiceNumber: { startsWith: prefix } } });
    await prisma.user.deleteMany({ where: { email } });
    await prisma.user.create({
      data: { email, fullname: "List Tester", passwordHash: await bcrypt.hash("password", 4) },
    });
    await prisma.invoice.createMany({
      data: [
        invoice(
          fixedIds[0],
          "PAST-PENDING",
          "Pending",
          "2026-05-01",
          "2026-06-01",
          "10.00",
          "Alpha",
        ),
        invoice(fixedIds[1], "PAST-DRAFT", "Draft", "2026-05-01", "2026-06-14", "20.00", "Beta"),
        invoice(fixedIds[2], "PAST-PAID", "Paid", "2025-12-01", "2026-01-01", "30.00", "Gamma"),
        invoice(
          fixedIds[3],
          "TODAY-PENDING",
          "Pending",
          "2026-06-15",
          "2026-06-15",
          "40.00",
          "Needle Customer",
        ),
        invoice(fixedIds[4], "FUTURE-DRAFT", "Draft", "2026-06-30", "2026-07-01", "50.00", "Delta"),
      ],
    });
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email, password: "password" })
      .expect(200);
    cookie = login.headers["set-cookie"] as unknown as string[];
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.invoice.deleteMany({ where: { invoiceNumber: { startsWith: prefix } } });
      await prisma.user.deleteMany({ where: { email } });
    }
    if (app) await app.close();
  });

  it("authenticates the whole route and validates numeric and enum inputs", async () => {
    await request(app.getHttpServer()).get("/invoices").expect(401);
    for (const query of [
      "page=0",
      "page=1e0",
      "pageSize=101",
      "page=1.5",
      "sortBy=currency",
      "ordering=asc",
      "fromDate=2026-02-31",
    ]) {
      const response = await request(app.getHttpServer())
        .get(`/invoices?${query}`)
        .set("Cookie", cookie)
        .expect(400);
      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 400,
          error: "Bad Request",
          message: expect.any(Array),
        }),
      );
    }
  });

  it("derives Overdue before pagination and returns the true SQL count", async () => {
    const pg = new Client({ connectionString: process.env["DATABASE_URL"] });
    await pg.connect();
    const handCount = await pg.query(
      `SELECT COUNT(*)::int AS total FROM "Invoice" WHERE "invoiceNumber" LIKE $1 AND status <> 'Paid' AND "dueDate" < $2::date`,
      [`${prefix}%`, "2026-06-15"],
    );
    await pg.end();
    const response = await request(app.getHttpServer())
      .get(
        `/invoices?status=Overdue&keyword=${prefix}&pageSize=1&page=1&sortBy=totalAmount&ordering=ASC`,
      )
      .set("Cookie", cookie)
      .expect(200);
    expect(response.body.paging).toEqual({ page: 1, pageSize: 1, total: handCount.rows[0].total });
    expect(response.body.data.map((row: { invoiceNumber: string }) => row.invoiceNumber)).toEqual([
      `${prefix}PAST-PENDING`,
    ]);
    expect(response.body.data[0].status).toBe("Overdue");
  });

  it("applies each effective status predicate and keeps paid past-due invoices Paid", async () => {
    const expected = { Overdue: 2, Paid: 1, Pending: 1, Draft: 1 };
    for (const [status, total] of Object.entries(expected)) {
      const response = await request(app.getHttpServer())
        .get(`/invoices?keyword=${prefix}&status=${status}&pageSize=100`)
        .set("Cookie", cookie)
        .expect(200);
      expect(response.body.paging.total).toBe(total);
      expect(response.body.data.every((row: { status: string }) => row.status === status)).toBe(
        true,
      );
    }
  });

  it("uses inclusive invoice-date filters, case-insensitive search, empty beyond-last pages, and stable id ties", async () => {
    const tied = await request(app.getHttpServer())
      .get(`/invoices?keyword=${prefix}&fromDate=2026-05-01&toDate=2026-05-01&ordering=ASC`)
      .set("Cookie", cookie)
      .expect(200);
    expect(tied.body.data.map((row: { invoiceId: string }) => row.invoiceId)).toEqual([
      fixedIds[0],
      fixedIds[1],
    ]);
    const searched = await request(app.getHttpServer())
      .get("/invoices?keyword=needle%20customer")
      .set("Cookie", cookie)
      .expect(200);
    expect(
      searched.body.data.some(
        (row: { invoiceNumber: string }) => row.invoiceNumber === `${prefix}TODAY-PENDING`,
      ),
    ).toBe(true);
    const beyond = await request(app.getHttpServer())
      .get(`/invoices?keyword=${prefix}&page=99&pageSize=2`)
      .set("Cookie", cookie)
      .expect(200);
    expect(beyond.body).toEqual({ data: [], paging: { page: 99, pageSize: 2, total: 5 } });
  });

  it("treats SQL wildcard characters in search input as literal text", async () => {
    const response = await request(app.getHttpServer())
      .get(`/invoices?keyword=${encodeURIComponent(`${prefix}%_`)}`)
      .set("Cookie", cookie)
      .expect(200);

    expect(response.body).toEqual({ data: [], paging: { page: 1, pageSize: 10, total: 0 } });
  });
});

function invoice(
  invoiceId: string,
  suffix: string,
  status: string,
  invoiceDate: string,
  dueDate: string,
  totalAmount: string,
  customerName: string,
) {
  return {
    invoiceId,
    invoiceNumber: `TODO10-E2E-${suffix}`,
    customerName,
    customerEmail: `${suffix.toLowerCase()}@example.com`,
    invoiceDate: new Date(`${invoiceDate}T00:00:00Z`),
    dueDate: new Date(`${dueDate}T00:00:00Z`),
    currency: "AUD",
    status,
    taxPercent: "0.00",
    subtotal: totalAmount,
    taxAmount: "0.00",
    discount: "0.00",
    totalAmount,
    totalPaid: "0.00",
    balanceAmount: totalAmount,
  };
}

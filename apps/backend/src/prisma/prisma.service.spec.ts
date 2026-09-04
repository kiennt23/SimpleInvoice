import { AppConfig } from "../config/app-config";
import { PrismaService } from "./prisma.service";

const adapterCtorSpy = jest.fn().mockReturnValue({});

jest.mock("@prisma/adapter-pg", () => ({
  PrismaPg: class {
    constructor(options: unknown) {
      adapterCtorSpy(options);
    }
  },
}));
jest.mock("../generated/prisma/client", () => ({
  PrismaClient: class {
    $connect = jest.fn().mockResolvedValue(undefined);
    $disconnect = jest.fn().mockResolvedValue(undefined);
  },
}));

const CONFIG: AppConfig = {
  databaseUrl: "postgresql://postgres:pw@localhost:5432/postgres",
  jwtSecret: "test-secret",
  jwtExpiresInSeconds: 3600,
  businessTimeZone: "UTC",
  port: 3000,
};

describe("PrismaService", () => {
  beforeEach(() => {
    adapterCtorSpy.mockClear();
  });

  it("constructs the pg adapter from the injected config with max 10 and 10s timeout", () => {
    new PrismaService(CONFIG);

    expect(adapterCtorSpy).toHaveBeenCalledWith({
      connectionString: "postgresql://postgres:pw@localhost:5432/postgres",
      max: 10,
      connectionTimeoutMillis: 10000,
    });
  });

  it("connects on module init and disconnects on module destroy", async () => {
    const service = new PrismaService(CONFIG);

    await service.onModuleInit();
    await service.onModuleDestroy();

    expect(service.$connect).toHaveBeenCalledTimes(1);
    expect(service.$disconnect).toHaveBeenCalledTimes(1);
  });
});

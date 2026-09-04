import { parseAppConfig } from "./validate-config";

const VALID_ENV: Record<string, string> = {
  DATABASE_URL: "postgresql://postgres:pw@localhost:5432/postgres",
  JWT_SECRET: "test-secret",
};

describe("parseAppConfig", () => {
  it("parses a valid env into a typed config with defaults", () => {
    const config = parseAppConfig(VALID_ENV);

    expect(config).toEqual({
      databaseUrl: "postgresql://postgres:pw@localhost:5432/postgres",
      jwtSecret: "test-secret",
      jwtExpiresInSeconds: 3600,
      businessTimeZone: "UTC",
      port: 3000,
    });
    expect("appOrigin" in config).toBe(false);
  });

  it("accepts an explicit appOrigin", () => {
    const config = parseAppConfig({ ...VALID_ENV, APP_ORIGIN: "http://localhost:5173" });
    expect(config.appOrigin).toBe("http://localhost:5173");
  });

  it("throws a named error when DATABASE_URL is missing", () => {
    const env = { ...VALID_ENV };
    delete env["DATABASE_URL"];
    expect(() => parseAppConfig(env)).toThrow("Config validation error: DATABASE_URL is required");
  });

  it("throws a named error when JWT_SECRET is missing", () => {
    const env = { ...VALID_ENV };
    delete env["JWT_SECRET"];
    expect(() => parseAppConfig(env)).toThrow("Config validation error: JWT_SECRET is required");
  });

  it("throws a named error when BUSINESS_TIME_ZONE is not an IANA zone", () => {
    expect(() => parseAppConfig({ ...VALID_ENV, BUSINESS_TIME_ZONE: "Not/AZone" })).toThrow(
      'Config validation error: BUSINESS_TIME_ZONE must be a valid IANA time zone (got "Not/AZone")',
    );
  });

  it("accepts a valid IANA zone with underscore", () => {
    const config = parseAppConfig({ ...VALID_ENV, BUSINESS_TIME_ZONE: "Asia/Ho_Chi_Minh" });
    expect(config.businessTimeZone).toBe("Asia/Ho_Chi_Minh");
  });

  it("throws a named error when JWT_EXPIRES_IN_SECONDS is not an integer", () => {
    expect(() => parseAppConfig({ ...VALID_ENV, JWT_EXPIRES_IN_SECONDS: "abc" })).toThrow(
      'Config validation error: JWT_EXPIRES_IN_SECONDS must be an integer greater than 0 (got "abc")',
    );
  });

  it("throws a named error when PORT is not a positive integer", () => {
    expect(() => parseAppConfig({ ...VALID_ENV, PORT: "0" })).toThrow(
      'Config validation error: PORT must be an integer greater than 0 (got "0")',
    );
  });

  it("throws a named error when APP_ORIGIN is not an origin", () => {
    expect(() => parseAppConfig({ ...VALID_ENV, APP_ORIGIN: "http://not-an-origin/path" })).toThrow(
      'Config validation error: APP_ORIGIN must be a valid origin (e.g. http://localhost:5173) (got "http://not-an-origin/path")',
    );
  });
});

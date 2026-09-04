import { plainToInstance } from "class-transformer";
import { validateSync, ValidationError } from "class-validator";
import { AppConfig } from "./app-config";
import { ConfigEnv } from "./config-env";

const DEFAULT_JWT_EXPIRES_IN_SECONDS = 3600;
const DEFAULT_BUSINESS_TIME_ZONE = "UTC";
const DEFAULT_PORT = 3000;

function collectMessages(errors: ValidationError[]): string[] {
  return errors.flatMap((error) =>
    error.constraints === undefined ? [] : Object.values(error.constraints),
  );
}

/**
 * Single validation boundary for environment configuration. Parses the raw
 * env record into a typed AppConfig and throws a named, aggregated error at
 * boot when anything is missing or malformed.
 */
export function parseAppConfig(source: Record<string, string | undefined>): AppConfig {
  const env = plainToInstance(ConfigEnv, source);
  const messages = collectMessages(validateSync(env));
  if (messages.length > 0) {
    throw new Error(`Config validation error: ${messages.join("; ")}`);
  }

  return {
    databaseUrl: env.DATABASE_URL,
    jwtSecret: env.JWT_SECRET,
    jwtExpiresInSeconds:
      env.JWT_EXPIRES_IN_SECONDS === undefined
        ? DEFAULT_JWT_EXPIRES_IN_SECONDS
        : Number(env.JWT_EXPIRES_IN_SECONDS),
    businessTimeZone: env.BUSINESS_TIME_ZONE ?? DEFAULT_BUSINESS_TIME_ZONE,
    ...(env.APP_ORIGIN === undefined ? {} : { appOrigin: env.APP_ORIGIN }),
    port: env.PORT === undefined ? DEFAULT_PORT : Number(env.PORT),
  };
}

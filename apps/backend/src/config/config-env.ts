import { IsDefined, ValidationArguments, registerDecorator } from "class-validator";

function isIANATimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function isPositiveIntString(value: string): boolean {
  return /^[0-9]+$/.test(value) && Number(value) > 0;
}

function isOriginString(value: string): boolean {
  try {
    return new URL(value).origin === value;
  } catch {
    return false;
  }
}

function requiredMessage(args: ValidationArguments): string {
  return `${args.property} is required`;
}

/**
 * Registers a validator that skips `undefined` (requiredness is owned by
 * @IsDefined) and reports failures under a named `KEY must ...` message.
 */
function envRule(
  name: string,
  message: (value: string) => string,
  check: (value: string) => boolean,
): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    if (typeof propertyName !== "string") {
      return;
    }
    registerDecorator({
      name,
      target: object.constructor,
      propertyName,
      validator: {
        validate(value: unknown): boolean {
          return value === undefined || (typeof value === "string" && check(value));
        },
        defaultMessage(args: ValidationArguments): string {
          const record = args.object as Record<string, unknown>;
          const raw: unknown = record[args.property];
          return message(typeof raw === "string" ? raw : "");
        },
      },
    });
  };
}

/**
 * Raw environment variable shape. Property names mirror the env keys on
 * purpose: the config loader feeds `process.env` straight into this class.
 */
export class ConfigEnv {
  @IsDefined({ message: requiredMessage })
  @envRule(
    "isPostgresUrl",
    (value) => `DATABASE_URL must be a postgresql:// connection string (got "${value}")`,
    (value) => value.startsWith("postgresql://"),
  )
  DATABASE_URL!: string;

  @IsDefined({ message: requiredMessage })
  @envRule("isNonEmptyString", (value) => `JWT_SECRET must be a non-empty string (got "${value}")`, (value) => value.trim().length > 0)
  JWT_SECRET!: string;

  @envRule(
    "isPositiveInt",
    (value) => `JWT_EXPIRES_IN_SECONDS must be an integer greater than 0 (got "${value}")`,
    isPositiveIntString,
  )
  JWT_EXPIRES_IN_SECONDS?: string;

  @envRule(
    "isIANATimeZone",
    (value) => `BUSINESS_TIME_ZONE must be a valid IANA time zone (got "${value}")`,
    isIANATimeZone,
  )
  BUSINESS_TIME_ZONE?: string;

  @envRule(
    "isOrigin",
    (value) => `APP_ORIGIN must be a valid origin (e.g. http://localhost:5173) (got "${value}")`,
    isOriginString,
  )
  APP_ORIGIN?: string;

  @envRule(
    "isPositiveInt",
    (value) => `PORT must be an integer greater than 0 (got "${value}")`,
    isPositiveIntString,
  )
  PORT?: string;
}

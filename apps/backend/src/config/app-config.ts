export interface AppConfig {
  readonly databaseUrl: string;
  readonly jwtSecret: string;
  readonly jwtExpiresInSeconds: number;
  readonly businessTimeZone: string;
  readonly appOrigin?: string;
  readonly port: number;
}

export const APP_CONFIG = Symbol("APP_CONFIG");

import { Global, Module } from "@nestjs/common";
import { APP_CONFIG, AppConfig } from "./app-config";
import { parseAppConfig } from "./validate-config";

export function provideAppConfig(): AppConfig {
  return parseAppConfig(process.env);
}

@Global()
@Module({
  providers: [{ provide: APP_CONFIG, useFactory: provideAppConfig }],
  exports: [APP_CONFIG],
})
export class ConfigModule {}

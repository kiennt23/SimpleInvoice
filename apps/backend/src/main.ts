import "./instrument";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { loadRootEnvFile } from "./config/load-root-env";
import { provideAppConfig } from "./config/config.module";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  loadRootEnvFile();
  const config = provideAppConfig();
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  const swagger = new DocumentBuilder().setTitle("SimpleInvoice API").setVersion("0.0.0").build();
  const document = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup("api/docs", app, document);

  await app.listen(config.port, "0.0.0.0");
}

void bootstrap();

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";

type ErrorBody =
  | { statusCode: number; error: string; message: string[] }
  | { statusCode: number; error: string; message: string };

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item): item is string => typeof item === "string");
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode: number;
    let error: string;
    let message: string | string[];

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === "object" && body !== null) {
        const record = body as Record<string, unknown>;
        const bodyError = record["error"];
        const bodyMessage = record["message"];
        error = typeof bodyError === "string" ? bodyError : (HttpStatusText[statusCode] ?? "Error");
        message = isStringArray(bodyMessage)
          ? bodyMessage
          : typeof bodyMessage === "string"
            ? bodyMessage
            : exception.message;
      } else {
        error = HttpStatusText[statusCode] ?? "Error";
        message = exception.message;
      }
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      error = "Internal Server Error";
      message = "Internal Server Error";
      this.logger.error(
        "Unhandled exception",
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const payload: ErrorBody =
      typeof message === "string"
        ? { statusCode, error, message }
        : { statusCode, error, message: [...message] };
    response.status(statusCode).json(payload);
  }
}

const HttpStatusText: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  422: "Unprocessable Entity",
  429: "Too Many Requests",
  500: "Internal Server Error",
};

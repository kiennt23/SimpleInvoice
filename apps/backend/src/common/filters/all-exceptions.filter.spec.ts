import { ArgumentsHost, BadRequestException, HttpStatus } from "@nestjs/common";
import { AllExceptionsFilter } from "./all-exceptions.filter";

function makeHost(): { host: ArgumentsHost; status: jest.Mock; json: jest.Mock } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status, json };
  const request = {};
  const host = {
    switchToHttp: () => ({ getResponse: () => response, getRequest: () => request }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe("AllExceptionsFilter", () => {
  it("normalizes a validation BadRequestException to the API-006 shape", () => {
    const { host, status, json } = makeHost();
    const exception = new BadRequestException([
      "name must not be empty",
      "quantity must be an integer number",
    ]);
    new AllExceptionsFilter().catch(exception, host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      statusCode: 400,
      error: "Bad Request",
      message: ["name must not be empty", "quantity must be an integer number"],
    });
  });

  it("normalizes a non-validation HttpException to the API-007 shape", () => {
    const { host, status, json } = makeHost();
    const exception = new BadRequestException("single reason");
    new AllExceptionsFilter().catch(exception, host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      statusCode: 400,
      error: "Bad Request",
      message: "single reason",
    });
  });

  it("normalizes an unknown exception to a 500 that leaks no internals", () => {
    const { host, status, json } = makeHost();
    new AllExceptionsFilter().catch(new Error("secret database detail"), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      error: "Internal Server Error",
      message: "Internal Server Error",
    });
  });
});

import { Controller, Get } from "@nestjs/common";

@Controller()
export class HealthController {
  @Get()
  getHealth(): { status: "ok" } {
    return { status: "ok" };
  }
}

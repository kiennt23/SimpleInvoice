import { Controller, Get, Post } from "@nestjs/common";

@Controller("auth-fixture")
export class AuthFixtureController {
  @Get()
  read(): { ok: true } {
    return { ok: true };
  }

  @Post()
  write(): { ok: true } {
    return { ok: true };
  }
}

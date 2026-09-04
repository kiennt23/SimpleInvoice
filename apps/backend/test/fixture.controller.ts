import { Body, Controller, Post } from "@nestjs/common";
import { IsInt, IsNotEmpty } from "class-validator";
import { Public } from "../src/auth/public.decorator";

export class FixtureDto {
  @IsNotEmpty()
  name!: string;

  @IsInt()
  quantity!: number;
}

/**
 * Test-only controller. Registered exclusively inside the e2e testing module
 * (test/validation.e2e-spec.ts) — never in the production AppModule.
 */
@Controller("fixture")
@Public()
export class FixtureController {
  @Post()
  create(@Body() dto: FixtureDto): { received: FixtureDto } {
    return { received: dto };
  }
}

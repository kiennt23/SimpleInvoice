import { businessDate } from "./business-date";

describe("businessDate", () => {
  it("rolls forward across the date line: 2026-01-01T23:30:00Z in Asia/Ho_Chi_Minh (+7) -> 2026-01-02", () => {
    const clock = (): Date => new Date("2026-01-01T23:30:00Z");

    expect(businessDate(clock, "Asia/Ho_Chi_Minh")).toBe("2026-01-02");
  });

  it("stays on the UTC date for the same instant when the zone is UTC", () => {
    const clock = (): Date => new Date("2026-01-01T23:30:00Z");

    expect(businessDate(clock, "UTC")).toBe("2026-01-01");
  });

  it("rolls back: 2026-01-01T01:00:00Z in America/New_York (-5) -> 2025-12-31", () => {
    const clock = (): Date => new Date("2026-01-01T01:00:00Z");

    expect(businessDate(clock, "America/New_York")).toBe("2025-12-31");
  });

  it("emits a strict zero-padded YYYY-MM-DD string", () => {
    const clock = (): Date => new Date("2026-03-05T12:00:00Z");

    expect(businessDate(clock, "UTC")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(businessDate(clock, "UTC")).toBe("2026-03-05");
  });

  it("respects the zone's own calendar day, not the host's local day", () => {
    // 2026-06-15T17:00:00Z is 2026-06-16 00:00 in Ho Chi Minh but 2026-06-15 in UTC.
    const clock = (): Date => new Date("2026-06-15T17:00:00Z");

    expect(businessDate(clock, "Asia/Ho_Chi_Minh")).toBe("2026-06-16");
    expect(businessDate(clock, "UTC")).toBe("2026-06-15");
  });
});

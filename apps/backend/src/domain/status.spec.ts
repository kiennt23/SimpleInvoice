import { effectiveStatus, isOverdue } from "./status";

describe("effectiveStatus", () => {
  it("returns Pending when dueDate equals businessDate (STATUS-003 boundary: not overdue)", () => {
    expect(effectiveStatus("Pending", "2026-01-15", "2026-01-15")).toBe("Pending");
  });

  it("returns Overdue when a Pending invoice's due date is strictly before the business date", () => {
    expect(effectiveStatus("Pending", "2026-01-14", "2026-01-15")).toBe("Overdue");
  });

  it("returns Draft when a Draft invoice's due date is in the future", () => {
    expect(effectiveStatus("Draft", "2026-01-20", "2026-01-15")).toBe("Draft");
  });

  it("returns Overdue for a Draft invoice past due (STATUS-003: not Paid and due before today)", () => {
    expect(effectiveStatus("Draft", "2026-01-01", "2026-01-15")).toBe("Overdue");
  });

  it("keeps a Paid invoice Paid even when its due date is long past (STATUS-004)", () => {
    expect(effectiveStatus("Paid", "2025-01-01", "2026-01-15")).toBe("Paid");
  });

  it("keeps a Paid invoice Paid on its due date", () => {
    expect(effectiveStatus("Paid", "2026-01-15", "2026-01-15")).toBe("Paid");
  });
});

describe("isOverdue", () => {
  it("is false when dueDate equals businessDate (strict comparison boundary)", () => {
    expect(isOverdue("2026-01-15", "2026-01-15")).toBe(false);
  });

  it("is true when dueDate is strictly before businessDate", () => {
    expect(isOverdue("2026-01-14", "2026-01-15")).toBe(true);
  });

  it("is false when dueDate is after businessDate", () => {
    expect(isOverdue("2026-01-16", "2026-01-15")).toBe(false);
  });

  it("compares ISO date strings correctly across month boundaries", () => {
    expect(isOverdue("2026-01-31", "2026-02-01")).toBe(true);
  });
});

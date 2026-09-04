/**
 * ADR 0004: the business date is the calendar date of the clock instant in the
 * configured business IANA timezone - not the host's local date and not UTC
 * unless the zone is UTC. The clock is injected so tests pin it deterministically.
 */
export function businessDate(clock: () => Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(clock());
}

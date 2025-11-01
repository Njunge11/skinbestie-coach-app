/**
 * Normalize date to midnight UTC (removes time component)
 * This ensures consistent date comparisons regardless of time zones
 */
export function toMidnightUTC(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

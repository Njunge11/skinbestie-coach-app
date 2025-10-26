import { fromZonedTime } from "date-fns-tz";
import { format } from "date-fns";

/**
 * Calculate on-time deadline and grace period end for a scheduled step
 *
 * @param scheduledDate - The date the step is scheduled for (Date object or string)
 * @param timeOfDay - 'morning' or 'evening'
 * @param timezone - IANA timezone string (e.g., 'Europe/London', 'America/New_York')
 * @returns Object with onTimeDeadline and gracePeriodEnd as UTC timestamps
 */
export function calculateDeadlines(
  scheduledDate: Date,
  timeOfDay: "morning" | "evening",
  timezone: string
): { onTimeDeadline: Date; gracePeriodEnd: Date } {
  // Extract year, month, day from the scheduled date
  const year = scheduledDate.getFullYear();
  const month = scheduledDate.getMonth();
  const day = scheduledDate.getDate();

  // Create a new date at the target time in the user's timezone
  let localDateTime: Date;

  if (timeOfDay === "morning") {
    // Morning deadline: noon (12:00:00.000) in user's timezone
    localDateTime = new Date(year, month, day, 12, 0, 0, 0);
  } else {
    // Evening deadline: 11:59:59.999 PM in user's timezone
    localDateTime = new Date(year, month, day, 23, 59, 59, 999);
  }

  // Convert from the user's timezone to UTC
  const onTimeDeadline = fromZonedTime(localDateTime, timezone);

  // Grace period ends 24 hours after the on-time deadline
  const gracePeriodEnd = new Date(onTimeDeadline.getTime() + 24 * 60 * 60 * 1000);

  return { onTimeDeadline, gracePeriodEnd };
}

/**
 * Determine the status of a completed step based on when it was completed
 *
 * @param completedAt - When the step was completed
 * @param onTimeDeadline - The on-time deadline
 * @param gracePeriodEnd - When the grace period ends
 * @returns 'on-time' | 'late' | 'missed'
 */
export function determineStatus(
  completedAt: Date,
  onTimeDeadline: Date,
  gracePeriodEnd: Date
): "on-time" | "late" | "missed" {
  if (completedAt <= onTimeDeadline) {
    return "on-time";
  } else if (completedAt <= gracePeriodEnd) {
    return "late";
  } else {
    return "missed";
  }
}

/**
 * Check if a routine product should generate a step on a given date
 * based on its frequency and scheduled days
 *
 * @param product - Product with frequency and optional days array
 * @param date - The date to check
 * @returns true if a step should be generated on this date
 */
export function shouldGenerateForDate(
  product: { frequency: string; days?: string[] },
  date: Date
): boolean {
  // Daily frequency: generate for every day
  // Note: Schema now uses PostgreSQL enum with lowercase "daily"
  if (product.frequency === "daily") {
    return true;
  }

  // For 2x/3x per week or specific_days: check if day matches the scheduled days
  if (product.days && product.days.length > 0) {
    // Get the day name (e.g., "Monday", "Tuesday")
    const dayName = format(date, "EEEE");

    // Check if this day is in the scheduled days
    return product.days.includes(dayName);
  }

  // Default: don't generate
  return false;
}

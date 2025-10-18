import type { Routine, RoutineStatus } from "../types";

/**
 * Calculate the status of a routine based on its dates
 */
export function getRoutineStatus(routine: Routine): RoutineStatus {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Normalize to start of day

  const startDate = new Date(routine.startDate);
  startDate.setHours(0, 0, 0, 0);

  // If no end date, it's ongoing (indefinite)
  if (!routine.endDate) {
    if (now >= startDate) {
      return "ongoing";
    }
    return "not_started";
  }

  const endDate = new Date(routine.endDate);
  endDate.setHours(0, 0, 0, 0);

  // Check status based on dates
  if (now < startDate) {
    return "not_started";
  } else if (now > endDate) {
    return "complete";
  } else {
    return "ongoing";
  }
}

/**
 * Format routine status for display
 */
export function formatRoutineStatus(status: RoutineStatus): string {
  switch (status) {
    case "ongoing":
      return "Ongoing";
    case "complete":
      return "Complete";
    case "not_started":
      return "Upcoming";
    default:
      return "Unknown";
  }
}

/**
 * Format date range for display
 */
export function formatRoutineDateRange(routine: Routine): string {
  const startDate = new Date(routine.startDate);
  const formattedStart = startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (!routine.endDate) {
    return `Started: ${formattedStart}`;
  }

  const endDate = new Date(routine.endDate);
  const formattedEnd = endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${formattedStart} - ${formattedEnd}`;
}

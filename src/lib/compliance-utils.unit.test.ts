import { describe, it, expect } from "vitest";
import {
  calculateDeadlines,
  determineStatus,
  shouldGenerateForDate,
} from "./compliance-utils";

describe("Compliance Utils - Unit Tests", () => {
  describe("calculateDeadlines", () => {
    describe("Morning steps", () => {
      it("sets on-time deadline to noon on scheduled date in Europe/London timezone", () => {
        const scheduledDate = new Date("2025-01-15"); // Wednesday
        const timeOfDay = "morning";
        const timezone = "Europe/London";

        const result = calculateDeadlines(scheduledDate, timeOfDay, timezone);

        // On-time deadline: 12:00 PM (noon) on Jan 15, 2025 in London
        expect(result.onTimeDeadline.toISOString()).toBe(
          "2025-01-15T12:00:00.000Z"
        );
      });

      it("sets grace period end to noon next day (24 hours after on-time deadline)", () => {
        const scheduledDate = new Date("2025-01-15");
        const timeOfDay = "morning";
        const timezone = "Europe/London";

        const result = calculateDeadlines(scheduledDate, timeOfDay, timezone);

        // Grace period ends: 12:00 PM (noon) on Jan 16, 2025 in London
        expect(result.gracePeriodEnd.toISOString()).toBe(
          "2025-01-16T12:00:00.000Z"
        );
      });

      it("handles timezone offset correctly for America/New_York", () => {
        const scheduledDate = new Date("2025-01-15");
        const timeOfDay = "morning";
        const timezone = "America/New_York";

        const result = calculateDeadlines(scheduledDate, timeOfDay, timezone);

        // Noon in New York is 5 hours behind UTC (during standard time)
        expect(result.onTimeDeadline.toISOString()).toBe(
          "2025-01-15T17:00:00.000Z"
        );
        expect(result.gracePeriodEnd.toISOString()).toBe(
          "2025-01-16T17:00:00.000Z"
        );
      });

      it("handles daylight saving time transition for Europe/London", () => {
        // March 30, 2025 - DST starts in London (clocks go forward)
        const scheduledDate = new Date("2025-03-30");
        const timeOfDay = "morning";
        const timezone = "Europe/London";

        const result = calculateDeadlines(scheduledDate, timeOfDay, timezone);

        // During BST (British Summer Time), London is UTC+1
        expect(result.onTimeDeadline.toISOString()).toBe(
          "2025-03-30T11:00:00.000Z"
        );
      });
    });

    describe("Evening steps", () => {
      it("sets on-time deadline to 11:59 PM on scheduled date in Europe/London timezone", () => {
        const scheduledDate = new Date("2025-01-15");
        const timeOfDay = "evening";
        const timezone = "Europe/London";

        const result = calculateDeadlines(scheduledDate, timeOfDay, timezone);

        // On-time deadline: 11:59:59.999 PM on Jan 15, 2025 in London
        expect(result.onTimeDeadline.toISOString()).toBe(
          "2025-01-15T23:59:59.999Z"
        );
      });

      it("sets grace period end to 11:59 PM next day (24 hours after on-time deadline)", () => {
        const scheduledDate = new Date("2025-01-15");
        const timeOfDay = "evening";
        const timezone = "Europe/London";

        const result = calculateDeadlines(scheduledDate, timeOfDay, timezone);

        // Grace period ends: 11:59:59.999 PM on Jan 16, 2025 in London
        expect(result.gracePeriodEnd.toISOString()).toBe(
          "2025-01-16T23:59:59.999Z"
        );
      });

      it("handles timezone offset correctly for America/New_York", () => {
        const scheduledDate = new Date("2025-01-15");
        const timeOfDay = "evening";
        const timezone = "America/New_York";

        const result = calculateDeadlines(scheduledDate, timeOfDay, timezone);

        // 11:59 PM in New York is 5 hours behind UTC (during standard time)
        expect(result.onTimeDeadline.toISOString()).toBe(
          "2025-01-16T04:59:59.999Z"
        );
        expect(result.gracePeriodEnd.toISOString()).toBe(
          "2025-01-17T04:59:59.999Z"
        );
      });
    });
  });

  describe("determineStatus", () => {
    const onTimeDeadline = new Date("2025-01-15T12:00:00.000Z"); // Noon
    const gracePeriodEnd = new Date("2025-01-16T12:00:00.000Z"); // Noon next day

    it("returns 'on-time' when completed exactly at on-time deadline", () => {
      const completedAt = new Date("2025-01-15T12:00:00.000Z");

      const status = determineStatus(completedAt, onTimeDeadline, gracePeriodEnd);

      expect(status).toBe("on-time");
    });

    it("returns 'on-time' when completed before on-time deadline", () => {
      const completedAt = new Date("2025-01-15T10:00:00.000Z");

      const status = determineStatus(completedAt, onTimeDeadline, gracePeriodEnd);

      expect(status).toBe("on-time");
    });

    it("returns 'on-time' when completed 1 millisecond before on-time deadline", () => {
      const completedAt = new Date("2025-01-15T11:59:59.999Z");

      const status = determineStatus(completedAt, onTimeDeadline, gracePeriodEnd);

      expect(status).toBe("on-time");
    });

    it("returns 'late' when completed 1 millisecond after on-time deadline", () => {
      const completedAt = new Date("2025-01-15T12:00:00.001Z");

      const status = determineStatus(completedAt, onTimeDeadline, gracePeriodEnd);

      expect(status).toBe("late");
    });

    it("returns 'late' when completed after on-time deadline but before grace period end", () => {
      const completedAt = new Date("2025-01-15T18:00:00.000Z");

      const status = determineStatus(completedAt, onTimeDeadline, gracePeriodEnd);

      expect(status).toBe("late");
    });

    it("returns 'late' when completed exactly at grace period end", () => {
      const completedAt = new Date("2025-01-16T12:00:00.000Z");

      const status = determineStatus(completedAt, onTimeDeadline, gracePeriodEnd);

      expect(status).toBe("late");
    });

    it("returns 'late' when completed 1 millisecond before grace period end", () => {
      const completedAt = new Date("2025-01-16T11:59:59.999Z");

      const status = determineStatus(completedAt, onTimeDeadline, gracePeriodEnd);

      expect(status).toBe("late");
    });

    it("returns 'missed' when completed 1 millisecond after grace period end", () => {
      const completedAt = new Date("2025-01-16T12:00:00.001Z");

      const status = determineStatus(completedAt, onTimeDeadline, gracePeriodEnd);

      expect(status).toBe("missed");
    });

    it("returns 'missed' when completed days after grace period end", () => {
      const completedAt = new Date("2025-01-20T12:00:00.000Z");

      const status = determineStatus(completedAt, onTimeDeadline, gracePeriodEnd);

      expect(status).toBe("missed");
    });
  });

  describe("shouldGenerateForDate", () => {
    describe("Daily frequency", () => {
      it("returns true for any day of the week", () => {
        const product = {
          frequency: "Daily",
          days: undefined,
        };

        const monday = new Date("2025-01-13"); // Monday
        const tuesday = new Date("2025-01-14"); // Tuesday
        const saturday = new Date("2025-01-18"); // Saturday
        const sunday = new Date("2025-01-19"); // Sunday

        expect(shouldGenerateForDate(product, monday)).toBe(true);
        expect(shouldGenerateForDate(product, tuesday)).toBe(true);
        expect(shouldGenerateForDate(product, saturday)).toBe(true);
        expect(shouldGenerateForDate(product, sunday)).toBe(true);
      });
    });

    describe("2x per week frequency", () => {
      it("returns true when date matches one of the specified days", () => {
        const product = {
          frequency: "2x per week",
          days: ["Monday", "Thursday"],
        };

        const monday = new Date("2025-01-13"); // Monday
        const thursday = new Date("2025-01-16"); // Thursday

        expect(shouldGenerateForDate(product, monday)).toBe(true);
        expect(shouldGenerateForDate(product, thursday)).toBe(true);
      });

      it("returns false when date does not match specified days", () => {
        const product = {
          frequency: "2x per week",
          days: ["Monday", "Thursday"],
        };

        const tuesday = new Date("2025-01-14"); // Tuesday
        const wednesday = new Date("2025-01-15"); // Wednesday
        const friday = new Date("2025-01-17"); // Friday

        expect(shouldGenerateForDate(product, tuesday)).toBe(false);
        expect(shouldGenerateForDate(product, wednesday)).toBe(false);
        expect(shouldGenerateForDate(product, friday)).toBe(false);
      });

      it("handles case-sensitive day names", () => {
        const product = {
          frequency: "2x per week",
          days: ["Monday", "Thursday"],
        };

        const monday = new Date("2025-01-13"); // Monday

        expect(shouldGenerateForDate(product, monday)).toBe(true);
      });
    });

    describe("3x per week frequency", () => {
      it("returns true when date matches one of the specified days", () => {
        const product = {
          frequency: "3x per week",
          days: ["Monday", "Wednesday", "Friday"],
        };

        const monday = new Date("2025-01-13"); // Monday
        const wednesday = new Date("2025-01-15"); // Wednesday
        const friday = new Date("2025-01-17"); // Friday

        expect(shouldGenerateForDate(product, monday)).toBe(true);
        expect(shouldGenerateForDate(product, wednesday)).toBe(true);
        expect(shouldGenerateForDate(product, friday)).toBe(true);
      });

      it("returns false when date does not match specified days", () => {
        const product = {
          frequency: "3x per week",
          days: ["Monday", "Wednesday", "Friday"],
        };

        const tuesday = new Date("2025-01-14"); // Tuesday
        const thursday = new Date("2025-01-16"); // Thursday
        const saturday = new Date("2025-01-18"); // Saturday
        const sunday = new Date("2025-01-19"); // Sunday

        expect(shouldGenerateForDate(product, tuesday)).toBe(false);
        expect(shouldGenerateForDate(product, thursday)).toBe(false);
        expect(shouldGenerateForDate(product, saturday)).toBe(false);
        expect(shouldGenerateForDate(product, sunday)).toBe(false);
      });
    });

    describe("Edge cases", () => {
      it("handles days array with different ordering", () => {
        const product = {
          frequency: "2x per week",
          days: ["Thursday", "Monday"], // Not in week order
        };

        const monday = new Date("2025-01-13");
        const thursday = new Date("2025-01-16");

        expect(shouldGenerateForDate(product, monday)).toBe(true);
        expect(shouldGenerateForDate(product, thursday)).toBe(true);
      });

      it("handles year boundary - Sunday Dec 29, 2024", () => {
        const product = {
          frequency: "2x per week",
          days: ["Sunday", "Wednesday"],
        };

        const sunday = new Date("2024-12-29"); // Sunday

        expect(shouldGenerateForDate(product, sunday)).toBe(true);
      });

      it("handles year boundary - Wednesday Jan 1, 2025", () => {
        const product = {
          frequency: "2x per week",
          days: ["Sunday", "Wednesday"],
        };

        const wednesday = new Date("2025-01-01"); // Wednesday

        expect(shouldGenerateForDate(product, wednesday)).toBe(true);
      });
    });
  });
});

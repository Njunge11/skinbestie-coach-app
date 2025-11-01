import { describe, it, expect } from "vitest";
import { shouldGenerateForDate } from "../compliance-utils";

describe("shouldGenerateForDate", () => {
  describe("Daily frequency", () => {
    it("returns true for any day when frequency is daily", () => {
      const product = { frequency: "daily", days: undefined };

      // Test multiple days of the week
      expect(shouldGenerateForDate(product, new Date("2025-11-03"))).toBe(true); // Monday
      expect(shouldGenerateForDate(product, new Date("2025-11-04"))).toBe(true); // Tuesday
      expect(shouldGenerateForDate(product, new Date("2025-11-05"))).toBe(true); // Wednesday
      expect(shouldGenerateForDate(product, new Date("2025-11-06"))).toBe(true); // Thursday
      expect(shouldGenerateForDate(product, new Date("2025-11-07"))).toBe(true); // Friday
      expect(shouldGenerateForDate(product, new Date("2025-11-08"))).toBe(true); // Saturday
      expect(shouldGenerateForDate(product, new Date("2025-11-09"))).toBe(true); // Sunday
    });

    it("ignores days array when frequency is daily", () => {
      // Even if days array is provided, daily should generate every day
      const product = { frequency: "daily", days: ["Monday", "Wednesday"] };

      expect(shouldGenerateForDate(product, new Date("2025-11-04"))).toBe(true); // Tuesday (not in days array)
      expect(shouldGenerateForDate(product, new Date("2025-11-05"))).toBe(true); // Wednesday (in days array)
    });
  });

  describe("Specific days frequency", () => {
    it("returns true only for specified days (Mon/Wed/Fri)", () => {
      const product = {
        frequency: "specific_days",
        days: ["Monday", "Wednesday", "Friday"],
      };

      expect(shouldGenerateForDate(product, new Date("2025-11-03"))).toBe(true); // Monday
      expect(shouldGenerateForDate(product, new Date("2025-11-04"))).toBe(
        false,
      ); // Tuesday
      expect(shouldGenerateForDate(product, new Date("2025-11-05"))).toBe(true); // Wednesday
      expect(shouldGenerateForDate(product, new Date("2025-11-06"))).toBe(
        false,
      ); // Thursday
      expect(shouldGenerateForDate(product, new Date("2025-11-07"))).toBe(true); // Friday
      expect(shouldGenerateForDate(product, new Date("2025-11-08"))).toBe(
        false,
      ); // Saturday
      expect(shouldGenerateForDate(product, new Date("2025-11-09"))).toBe(
        false,
      ); // Sunday
    });

    it("returns true only for specified days (Tue/Thu/Sat)", () => {
      const product = {
        frequency: "specific_days",
        days: ["Tuesday", "Thursday", "Saturday"],
      };

      expect(shouldGenerateForDate(product, new Date("2025-11-03"))).toBe(
        false,
      ); // Monday
      expect(shouldGenerateForDate(product, new Date("2025-11-04"))).toBe(true); // Tuesday
      expect(shouldGenerateForDate(product, new Date("2025-11-05"))).toBe(
        false,
      ); // Wednesday
      expect(shouldGenerateForDate(product, new Date("2025-11-06"))).toBe(true); // Thursday
      expect(shouldGenerateForDate(product, new Date("2025-11-07"))).toBe(
        false,
      ); // Friday
      expect(shouldGenerateForDate(product, new Date("2025-11-08"))).toBe(true); // Saturday
      expect(shouldGenerateForDate(product, new Date("2025-11-09"))).toBe(
        false,
      ); // Sunday
    });

    it("returns true for weekend days (Sat/Sun)", () => {
      const product = {
        frequency: "specific_days",
        days: ["Saturday", "Sunday"],
      };

      expect(shouldGenerateForDate(product, new Date("2025-11-03"))).toBe(
        false,
      ); // Monday
      expect(shouldGenerateForDate(product, new Date("2025-11-07"))).toBe(
        false,
      ); // Friday
      expect(shouldGenerateForDate(product, new Date("2025-11-08"))).toBe(true); // Saturday
      expect(shouldGenerateForDate(product, new Date("2025-11-09"))).toBe(true); // Sunday
    });

    it("returns false when days array is empty", () => {
      const product = {
        frequency: "specific_days",
        days: [],
      };

      expect(shouldGenerateForDate(product, new Date("2025-11-03"))).toBe(
        false,
      ); // Monday
      expect(shouldGenerateForDate(product, new Date("2025-11-08"))).toBe(
        false,
      ); // Saturday
    });

    it("returns false when days array is null", () => {
      const product = {
        frequency: "specific_days",
        days: undefined,
      };

      expect(shouldGenerateForDate(product, new Date("2025-11-03"))).toBe(
        false,
      ); // Monday
      expect(shouldGenerateForDate(product, new Date("2025-11-08"))).toBe(
        false,
      ); // Saturday
    });
  });

  describe("Edge cases", () => {
    it("returns true when days array exists regardless of frequency string", () => {
      // The function checks for days array presence, not specific frequency value
      const product = {
        frequency: "custom" as string, // Non-standard frequency
        days: ["Monday"],
      };

      expect(shouldGenerateForDate(product, new Date("2025-11-03"))).toBe(true); // Monday (in days)
      expect(shouldGenerateForDate(product, new Date("2025-11-04"))).toBe(
        false,
      ); // Tuesday (not in days)
    });
  });
});

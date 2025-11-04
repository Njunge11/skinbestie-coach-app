// Types and Zod schemas for stats API

import { z } from "zod";

// Request validation schema
export const getStatsRequestSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
});

// Response schemas
export const todayProgressSchema = z.object({
  completed: z.number(),
  total: z.number(),
  percentage: z.number(),
});

export const currentStreakSchema = z.object({
  days: z.number(),
});

export const weeklyComplianceSchema = z.object({
  percentage: z.number(),
  completed: z.number(),
  total: z.number(),
});

export const statsResponseSchema = z.object({
  todayProgress: todayProgressSchema,
  currentStreak: currentStreakSchema,
  weeklyCompliance: weeklyComplianceSchema,
});

// TypeScript types inferred from schemas
export type GetStatsRequest = z.infer<typeof getStatsRequestSchema>;
export type TodayProgress = z.infer<typeof todayProgressSchema>;
export type CurrentStreak = z.infer<typeof currentStreakSchema>;
export type WeeklyCompliance = z.infer<typeof weeklyComplianceSchema>;
export type StatsResponse = z.infer<typeof statsResponseSchema>;

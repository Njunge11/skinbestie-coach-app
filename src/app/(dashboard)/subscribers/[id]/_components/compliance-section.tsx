"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Dummy compliance data for different time periods
const complianceDataByPeriod = {
  week: {
    period: { start: "Oct 9", end: "Oct 15" },
    overall: {
      prescribed: 51, // 5 daily AM (35) + 2 daily PM (14) + 1 PM 2x/week (2)
      onTime: 33,
      late: 8,
      missed: 10,
    },
    am: {
      prescribed: 35, // 5 steps × 7 days
      completed: 25,
      onTime: 21,
      late: 4,
      missed: 10,
    },
    pm: {
      prescribed: 16, // 2 daily × 7 days + 1 step 2x/week (2)
      completed: 16,
      onTime: 12,
      late: 4,
      missed: 0,
    },
    steps: [
      {
        id: 1,
        name: "Cleanser",
        timeOfDay: "morning",
        frequency: "Daily",
        prescribed: 7,
        completed: 6,
        onTime: 5,
        late: 1,
        missed: 1,
        missedDates: ["Saturday, Oct 12, 2025"],
      },
      {
        id: 2,
        name: "Vitamin C Serum",
        timeOfDay: "morning",
        frequency: "Daily",
        prescribed: 7,
        completed: 7,
        onTime: 6,
        late: 1,
        missed: 0,
        missedDates: [],
      },
      {
        id: 3,
        name: "Moisturizer",
        timeOfDay: "morning",
        frequency: "Daily",
        prescribed: 7,
        completed: 6,
        onTime: 5,
        late: 1,
        missed: 1,
        missedDates: ["Monday, Oct 14, 2025"],
      },
      {
        id: 4,
        name: "Sunscreen (SPF)",
        timeOfDay: "morning",
        frequency: "Daily",
        prescribed: 7,
        completed: 5,
        onTime: 4,
        late: 1,
        missed: 2,
        missedDates: ["Friday, Oct 11, 2025", "Monday, Oct 14, 2025"],
      },
      {
        id: 5,
        name: "Cleanser",
        timeOfDay: "evening",
        frequency: "Daily",
        prescribed: 7,
        completed: 7,
        onTime: 6,
        late: 1,
        missed: 0,
        missedDates: [],
      },
      {
        id: 6,
        name: "Retinol Serum",
        timeOfDay: "evening",
        frequency: "2x per week",
        prescribed: 2, // Mon & Thu
        completed: 2,
        onTime: 1,
        late: 1,
        missed: 0,
        missedDates: [],
      },
      {
        id: 7,
        name: "Night Cream",
        timeOfDay: "evening",
        frequency: "Daily",
        prescribed: 7,
        completed: 7,
        onTime: 5,
        late: 2,
        missed: 0,
        missedDates: [],
      },
      {
        id: 8,
        name: "Eye Cream",
        timeOfDay: "morning",
        frequency: "Daily",
        prescribed: 7,
        completed: 1,
        onTime: 1,
        late: 0,
        missed: 6,
        missedDates: ["Thursday, Oct 9, 2025", "Friday, Oct 10, 2025", "Saturday, Oct 11, 2025", "Sunday, Oct 12, 2025", "Monday, Oct 13, 2025", "Monday, Oct 14, 2025"],
      },
    ],
  },
  month: {
    period: { start: "Sep 15", end: "Oct 15" },
    overall: {
      prescribed: 188, // 4 daily AM (120) + 2 daily PM (60) + 1 PM 2x/week (8)
      onTime: 142,
      late: 28,
      missed: 18,
    },
    am: {
      prescribed: 120, // 4 steps × 30 days
      completed: 106,
      onTime: 88,
      late: 18,
      missed: 14,
    },
    pm: {
      prescribed: 68, // 2 daily × 30 days + 1 step 2x/week (8)
      completed: 64,
      onTime: 54,
      late: 10,
      missed: 4,
    },
    steps: [
      {
        id: 1,
        name: "Cleanser",
        timeOfDay: "morning",
        frequency: "Daily",
        prescribed: 30,
        completed: 27,
        onTime: 23,
        late: 4,
        missed: 3,
        missedDates: ["Thursday, Sep 18, 2025", "Thursday, Sep 25, 2025", "Friday, Oct 3, 2025"],
      },
      {
        id: 2,
        name: "Vitamin C Serum",
        timeOfDay: "morning",
        frequency: "Daily",
        prescribed: 30,
        completed: 28,
        onTime: 24,
        late: 4,
        missed: 2,
        missedDates: ["Monday, Sep 22, 2025", "Wednesday, Oct 8, 2025"],
      },
      {
        id: 3,
        name: "Moisturizer",
        timeOfDay: "morning",
        frequency: "Daily",
        prescribed: 30,
        completed: 26,
        onTime: 20,
        late: 6,
        missed: 4,
        missedDates: ["Saturday, Sep 20, 2025", "Sunday, Sep 28, 2025", "Sunday, Oct 5, 2025", "Saturday, Oct 12, 2025"],
      },
      {
        id: 4,
        name: "Sunscreen (SPF)",
        timeOfDay: "morning",
        frequency: "Daily",
        prescribed: 30,
        completed: 25,
        onTime: 21,
        late: 4,
        missed: 5,
        missedDates: ["Wednesday, Sep 17, 2025", "Wednesday, Sep 24, 2025", "Wednesday, Oct 1, 2025", "Wednesday, Oct 8, 2025", "Monday, Oct 14, 2025"],
      },
      {
        id: 5,
        name: "Cleanser",
        timeOfDay: "evening",
        frequency: "Daily",
        prescribed: 30,
        completed: 29,
        onTime: 25,
        late: 4,
        missed: 1,
        missedDates: ["Monday, Oct 6, 2025"],
      },
      {
        id: 6,
        name: "Retinol Serum",
        timeOfDay: "evening",
        frequency: "2x per week",
        prescribed: 8,
        completed: 7,
        onTime: 5,
        late: 2,
        missed: 1,
        missedDates: ["Sunday, Sep 21, 2025"],
      },
      {
        id: 7,
        name: "Night Cream",
        timeOfDay: "evening",
        frequency: "Daily",
        prescribed: 30,
        completed: 28,
        onTime: 24,
        late: 4,
        missed: 2,
        missedDates: ["Tuesday, Sep 30, 2025", "Friday, Oct 11, 2025"],
      },
    ],
  },
  "3mo": {
    period: { start: "Jul 15", end: "Oct 15" },
    overall: {
      prescribed: 566, // 4 daily AM (360) + 2 daily PM (180) + 1 PM 2x/week (26)
      onTime: 438,
      late: 82,
      missed: 46,
    },
    am: {
      prescribed: 360,
      completed: 318,
      onTime: 262,
      late: 56,
      missed: 42,
    },
    pm: {
      prescribed: 206,
      completed: 202,
      onTime: 176,
      late: 26,
      missed: 4,
    },
    steps: [
      {
        id: 1,
        name: "Cleanser",
        timeOfDay: "morning",
        frequency: "Daily",
        prescribed: 90,
        completed: 81,
        onTime: 68,
        late: 13,
        missed: 9,
        missedDates: ["Friday, Jul 18, 2025", "Friday, Jul 25, 2025", "Sunday, Aug 3, 2025", "Tuesday, Aug 12, 2025", "Thursday, Aug 28, 2025", "Monday, Sep 15, 2025", "Thursday, Sep 25, 2025", "Friday, Oct 3, 2025", "Saturday, Oct 12, 2025"],
      },
      {
        id: 2,
        name: "Vitamin C Serum",
        timeOfDay: "morning",
        frequency: "Daily",
        prescribed: 90,
        completed: 84,
        onTime: 70,
        late: 14,
        missed: 6,
        missedDates: ["Tuesday, Jul 22, 2025", "Tuesday, Aug 5, 2025", "Tuesday, Aug 19, 2025", "Monday, Sep 8, 2025", "Monday, Sep 22, 2025", "Wednesday, Oct 8, 2025"],
      },
      {
        id: 3,
        name: "Moisturizer",
        timeOfDay: "morning",
        frequency: "Daily",
        prescribed: 90,
        completed: 78,
        onTime: 62,
        late: 16,
        missed: 12,
        missedDates: ["Sunday, Jul 20, 2025", "Monday, Jul 28, 2025", "Monday, Aug 4, 2025", "Monday, Aug 11, 2025", "Wednesday, Aug 20, 2025", "Thursday, Aug 28, 2025", "Friday, Sep 5, 2025", "Friday, Sep 12, 2025", "Saturday, Sep 20, 2025", "Sunday, Sep 28, 2025", "Sunday, Oct 5, 2025", "Saturday, Oct 12, 2025"],
      },
      {
        id: 4,
        name: "Sunscreen (SPF)",
        timeOfDay: "morning",
        frequency: "Daily",
        prescribed: 90,
        completed: 75,
        onTime: 62,
        late: 13,
        missed: 15,
        missedDates: ["Thursday, Jul 17, 2025", "Thursday, Jul 24, 2025", "Thursday, Jul 31, 2025", "Thursday, Aug 7, 2025", "Thursday, Aug 14, 2025", "Thursday, Aug 21, 2025", "Thursday, Aug 28, 2025", "Thursday, Sep 4, 2025", "Thursday, Sep 11, 2025", "Wednesday, Sep 17, 2025", "Wednesday, Sep 24, 2025", "Wednesday, Oct 1, 2025", "Wednesday, Oct 8, 2025", "Monday, Oct 14, 2025", "Tuesday, Oct 15, 2025"],
      },
      {
        id: 5,
        name: "Cleanser",
        timeOfDay: "evening",
        frequency: "Daily",
        prescribed: 90,
        completed: 88,
        onTime: 76,
        late: 12,
        missed: 2,
        missedDates: ["Friday, Aug 15, 2025", "Monday, Oct 6, 2025"],
      },
      {
        id: 6,
        name: "Retinol Serum",
        timeOfDay: "evening",
        frequency: "2x per week",
        prescribed: 26,
        completed: 24,
        onTime: 19,
        late: 5,
        missed: 2,
        missedDates: ["Sunday, Aug 10, 2025", "Sunday, Sep 21, 2025"],
      },
      {
        id: 7,
        name: "Night Cream",
        timeOfDay: "evening",
        frequency: "Daily",
        prescribed: 90,
        completed: 90,
        onTime: 81,
        late: 9,
        missed: 0,
        missedDates: [],
      },
    ],
  },
  "6mo": {
    period: { start: "Apr 15", end: "Oct 15" },
    overall: {
      prescribed: 1132, // 4 daily AM (720) + 2 daily PM (360) + 1 PM 2x/week (52)
      onTime: 892,
      late: 164,
      missed: 76,
    },
    am: {
      prescribed: 720,
      completed: 642,
      onTime: 528,
      late: 114,
      missed: 78,
    },
    pm: {
      prescribed: 412,
      completed: 400,
      onTime: 364,
      late: 50,
      missed: 12,
    },
    steps: [
      {
        id: 1,
        name: "Cleanser",
        timeOfDay: "morning",
        frequency: "Daily",
        prescribed: 180,
        completed: 162,
        onTime: 136,
        late: 26,
        missed: 18,
        missedDates: ["Sunday, Apr 20, 2025", "Monday, Apr 28, 2025", "Monday, May 5, 2025", "Sunday, May 18, 2025", "Monday, Jun 2, 2025", "Sunday, Jun 15, 2025", "Saturday, Jun 28, 2025", "Thursday, Jul 10, 2025", "Friday, Jul 18, 2025", "Friday, Jul 25, 2025", "Sunday, Aug 3, 2025", "Tuesday, Aug 12, 2025", "Thursday, Aug 28, 2025", "Monday, Sep 15, 2025", "Thursday, Sep 25, 2025", "Friday, Oct 3, 2025", "Wednesday, Oct 8, 2025", "Saturday, Oct 12, 2025"],
      },
      {
        id: 2,
        name: "Vitamin C Serum",
        timeOfDay: "morning",
        frequency: "Daily",
        prescribed: 180,
        completed: 168,
        onTime: 142,
        late: 26,
        missed: 12,
        missedDates: ["Tuesday, Apr 22, 2025", "Thursday, May 8, 2025", "Thursday, May 22, 2025", "Thursday, Jun 5, 2025", "Thursday, Jun 19, 2025", "Thursday, Jul 3, 2025", "Tuesday, Jul 22, 2025", "Tuesday, Aug 5, 2025", "Tuesday, Aug 19, 2025", "Monday, Sep 8, 2025", "Monday, Sep 22, 2025", "Wednesday, Oct 8, 2025"],
      },
      {
        id: 3,
        name: "Moisturizer",
        timeOfDay: "morning",
        frequency: "Daily",
        prescribed: 180,
        completed: 156,
        onTime: 126,
        late: 30,
        missed: 24,
        missedDates: ["Friday, Apr 18, 2025", "Friday, Apr 25, 2025", "Friday, May 2, 2025", "Friday, May 9, 2025", "Friday, May 16, 2025", "Friday, May 23, 2025", "Friday, May 30, 2025", "Friday, Jun 6, 2025", "Friday, Jun 13, 2025", "Friday, Jun 20, 2025", "Friday, Jun 27, 2025", "Friday, Jul 4, 2025", "Friday, Jul 11, 2025", "Friday, Jul 18, 2025", "Friday, Jul 25, 2025", "Friday, Aug 1, 2025", "Friday, Aug 8, 2025", "Friday, Aug 15, 2025", "Friday, Aug 22, 2025", "Friday, Aug 29, 2025", "Friday, Sep 5, 2025", "Friday, Sep 12, 2025", "Friday, Sep 19, 2025", "Friday, Sep 26, 2025"],
      },
      {
        id: 4,
        name: "Sunscreen (SPF)",
        timeOfDay: "morning",
        frequency: "Daily",
        prescribed: 180,
        completed: 156,
        onTime: 124,
        late: 32,
        missed: 24,
        missedDates: ["Thursday, Apr 17, 2025", "Thursday, Apr 24, 2025", "Thursday, May 1, 2025", "Thursday, May 8, 2025", "Thursday, May 15, 2025", "Thursday, May 22, 2025", "Thursday, May 29, 2025", "Thursday, Jun 5, 2025", "Thursday, Jun 12, 2025", "Thursday, Jun 19, 2025", "Thursday, Jun 26, 2025", "Thursday, Jul 3, 2025", "Thursday, Jul 10, 2025", "Thursday, Jul 17, 2025", "Thursday, Jul 24, 2025", "Thursday, Jul 31, 2025", "Thursday, Aug 7, 2025", "Thursday, Aug 14, 2025", "Thursday, Aug 21, 2025", "Thursday, Aug 28, 2025", "Thursday, Sep 4, 2025", "Thursday, Sep 11, 2025", "Thursday, Sep 18, 2025", "Thursday, Sep 25, 2025"],
      },
      {
        id: 5,
        name: "Cleanser",
        timeOfDay: "evening",
        frequency: "Daily",
        prescribed: 180,
        completed: 176,
        onTime: 154,
        late: 22,
        missed: 4,
        missedDates: ["Tuesday, May 20, 2025", "Tuesday, Jul 8, 2025", "Friday, Aug 15, 2025", "Monday, Oct 6, 2025"],
      },
      {
        id: 6,
        name: "Retinol Serum",
        timeOfDay: "evening",
        frequency: "2x per week",
        prescribed: 52,
        completed: 48,
        onTime: 40,
        late: 8,
        missed: 4,
        missedDates: ["Friday, May 16, 2025", "Friday, Jun 27, 2025", "Sunday, Aug 10, 2025", "Sunday, Sep 21, 2025"],
      },
      {
        id: 7,
        name: "Night Cream",
        timeOfDay: "evening",
        frequency: "Daily",
        prescribed: 180,
        completed: 176,
        onTime: 160,
        late: 16,
        missed: 4,
        missedDates: ["Thursday, Jun 5, 2025", "Tuesday, Jul 22, 2025", "Wednesday, Sep 3, 2025", "Friday, Oct 11, 2025"],
      },
    ],
  },
  all: {
    period: { start: "Apr 15", end: "Oct 15" },
    overall: {
      prescribed: 1132,
      onTime: 892,
      late: 164,
      missed: 76,
    },
    am: {
      prescribed: 720,
      completed: 642,
      onTime: 528,
      late: 114,
      missed: 78,
    },
    pm: {
      prescribed: 412,
      completed: 400,
      onTime: 364,
      late: 50,
      missed: 12,
    },
    steps: [
      {
        id: 1,
        name: "Cleanser",
        timeOfDay: "morning",
        frequency: "Daily",
        prescribed: 180,
        completed: 162,
        onTime: 136,
        late: 26,
        missed: 18,
        missedDates: ["Sunday, Apr 20, 2025", "Monday, Apr 28, 2025", "Monday, May 5, 2025", "Sunday, May 18, 2025", "Monday, Jun 2, 2025", "Sunday, Jun 15, 2025", "Saturday, Jun 28, 2025", "Thursday, Jul 10, 2025", "Friday, Jul 18, 2025", "Friday, Jul 25, 2025", "Sunday, Aug 3, 2025", "Tuesday, Aug 12, 2025", "Thursday, Aug 28, 2025", "Monday, Sep 15, 2025", "Thursday, Sep 25, 2025", "Friday, Oct 3, 2025", "Wednesday, Oct 8, 2025", "Saturday, Oct 12, 2025"],
      },
      {
        id: 2,
        name: "Vitamin C Serum",
        timeOfDay: "morning",
        frequency: "Daily",
        prescribed: 180,
        completed: 168,
        onTime: 142,
        late: 26,
        missed: 12,
        missedDates: ["Tuesday, Apr 22, 2025", "Thursday, May 8, 2025", "Thursday, May 22, 2025", "Thursday, Jun 5, 2025", "Thursday, Jun 19, 2025", "Thursday, Jul 3, 2025", "Tuesday, Jul 22, 2025", "Tuesday, Aug 5, 2025", "Tuesday, Aug 19, 2025", "Monday, Sep 8, 2025", "Monday, Sep 22, 2025", "Wednesday, Oct 8, 2025"],
      },
      {
        id: 3,
        name: "Moisturizer",
        timeOfDay: "morning",
        frequency: "Daily",
        prescribed: 180,
        completed: 156,
        onTime: 126,
        late: 30,
        missed: 24,
        missedDates: ["Friday, Apr 18, 2025", "Friday, Apr 25, 2025", "Friday, May 2, 2025", "Friday, May 9, 2025", "Friday, May 16, 2025", "Friday, May 23, 2025", "Friday, May 30, 2025", "Friday, Jun 6, 2025", "Friday, Jun 13, 2025", "Friday, Jun 20, 2025", "Friday, Jun 27, 2025", "Friday, Jul 4, 2025", "Friday, Jul 11, 2025", "Friday, Jul 18, 2025", "Friday, Jul 25, 2025", "Friday, Aug 1, 2025", "Friday, Aug 8, 2025", "Friday, Aug 15, 2025", "Friday, Aug 22, 2025", "Friday, Aug 29, 2025", "Friday, Sep 5, 2025", "Friday, Sep 12, 2025", "Friday, Sep 19, 2025", "Friday, Sep 26, 2025"],
      },
      {
        id: 4,
        name: "Sunscreen (SPF)",
        timeOfDay: "morning",
        frequency: "Daily",
        prescribed: 180,
        completed: 156,
        onTime: 124,
        late: 32,
        missed: 24,
        missedDates: ["Thursday, Apr 17, 2025", "Thursday, Apr 24, 2025", "Thursday, May 1, 2025", "Thursday, May 8, 2025", "Thursday, May 15, 2025", "Thursday, May 22, 2025", "Thursday, May 29, 2025", "Thursday, Jun 5, 2025", "Thursday, Jun 12, 2025", "Thursday, Jun 19, 2025", "Thursday, Jun 26, 2025", "Thursday, Jul 3, 2025", "Thursday, Jul 10, 2025", "Thursday, Jul 17, 2025", "Thursday, Jul 24, 2025", "Thursday, Jul 31, 2025", "Thursday, Aug 7, 2025", "Thursday, Aug 14, 2025", "Thursday, Aug 21, 2025", "Thursday, Aug 28, 2025", "Thursday, Sep 4, 2025", "Thursday, Sep 11, 2025", "Thursday, Sep 18, 2025", "Thursday, Sep 25, 2025"],
      },
      {
        id: 5,
        name: "Cleanser",
        timeOfDay: "evening",
        frequency: "Daily",
        prescribed: 180,
        completed: 176,
        onTime: 154,
        late: 22,
        missed: 4,
        missedDates: ["Tuesday, May 20, 2025", "Tuesday, Jul 8, 2025", "Friday, Aug 15, 2025", "Monday, Oct 6, 2025"],
      },
      {
        id: 6,
        name: "Retinol Serum",
        timeOfDay: "evening",
        frequency: "2x per week",
        prescribed: 52,
        completed: 48,
        onTime: 40,
        late: 8,
        missed: 4,
        missedDates: ["Friday, May 16, 2025", "Friday, Jun 27, 2025", "Sunday, Aug 10, 2025", "Sunday, Sep 21, 2025"],
      },
      {
        id: 7,
        name: "Night Cream",
        timeOfDay: "evening",
        frequency: "Daily",
        prescribed: 180,
        completed: 176,
        onTime: 160,
        late: 16,
        missed: 4,
        missedDates: ["Thursday, Jun 5, 2025", "Tuesday, Jul 22, 2025", "Wednesday, Sep 3, 2025", "Friday, Oct 11, 2025"],
      },
    ],
  },
};

type TimePeriod = "week" | "month" | "3mo" | "6mo" | "all";

export function ComplianceSection() {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("week");

  const toggleStep = (stepId: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const calculatePercentage = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  // Get data for selected period
  const complianceData = complianceDataByPeriod[selectedPeriod];

  const overallCompleted = complianceData.overall.onTime + complianceData.overall.late;
  const overallPercentage = calculatePercentage(
    overallCompleted,
    complianceData.overall.prescribed
  );

  const amPercentage = calculatePercentage(
    complianceData.am.completed,
    complianceData.am.prescribed
  );

  const pmPercentage = calculatePercentage(
    complianceData.pm.completed,
    complianceData.pm.prescribed
  );

  const periods: { value: TimePeriod; label: string }[] = [
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "3mo", label: "3mo" },
    { value: "6mo", label: "6mo" },
    { value: "all", label: "All" },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <CardTitle>Compliance</CardTitle>
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {periods.map((period) => (
              <button
                key={period.value}
                onClick={() => setSelectedPeriod(period.value)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                  selectedPeriod === period.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {complianceData.period.start} – {complianceData.period.end}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Adherence */}
        <div className="rounded-lg bg-primary p-6 text-primary-foreground">
          <p className="text-sm font-medium opacity-90 mb-1">Overall Adherence</p>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-4xl font-bold">{overallPercentage}%</span>
            <span className="text-sm opacity-75">
              {overallCompleted}/{complianceData.overall.prescribed}
            </span>
          </div>
          <div className="flex gap-4 text-xs">
            <div>
              <span className="opacity-75">On-time:</span>{" "}
              <span className="font-semibold">{complianceData.overall.onTime}</span>
            </div>
            <div>
              <span className="opacity-75">Late:</span>{" "}
              <span className="font-semibold">{complianceData.overall.late}</span>
            </div>
            <div>
              <span className="opacity-75">Missed:</span>{" "}
              <span className="font-semibold">{complianceData.overall.missed}</span>
            </div>
          </div>
        </div>

        {/* AM/PM Split */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Morning */}
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-chart-5/20 flex items-center justify-center text-sm">
                ☀️
              </div>
              <span className="text-sm font-semibold text-foreground">Morning</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Adherence</span>
                <span className="font-semibold text-foreground">{amPercentage}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-medium text-foreground">
                  {complianceData.am.completed}/{complianceData.am.prescribed}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">On-time</span>
                <span className="font-medium text-foreground">
                  {complianceData.am.onTime}/{complianceData.am.completed} (
                  {calculatePercentage(
                    complianceData.am.onTime,
                    complianceData.am.completed
                  )}
                  %)
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Late</span>
                <span className="text-foreground/70">{complianceData.am.late}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Missed</span>
                <span className="text-foreground/70">{complianceData.am.missed}</span>
              </div>
            </div>
          </div>

          {/* Evening */}
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-chart-3/20 flex items-center justify-center text-sm">
                🌙
              </div>
              <span className="text-sm font-semibold text-foreground">Evening</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Adherence</span>
                <span className="font-semibold text-foreground">{pmPercentage}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-medium text-foreground">
                  {complianceData.pm.completed}/{complianceData.pm.prescribed}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">On-time</span>
                <span className="font-medium text-foreground">
                  {complianceData.pm.onTime}/{complianceData.pm.completed} (
                  {calculatePercentage(
                    complianceData.pm.onTime,
                    complianceData.pm.completed
                  )}
                  %)
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Late</span>
                <span className="text-foreground/70">{complianceData.pm.late}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Missed</span>
                <span className="text-foreground/70">{complianceData.pm.missed}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Per-step Breakdown */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground mb-3">Per-step Details</h4>
          {complianceData.steps.map((step) => {
            const isExpanded = expandedSteps.has(step.id);
            const stepPercentage = calculatePercentage(step.completed, step.prescribed);
            const onTimePercentage = calculatePercentage(step.onTime, step.completed);

            return (
              <div key={step.id} className="rounded-lg border border-border">
                <button
                  onClick={() => toggleStep(step.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-foreground">
                          {step.name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {step.timeOfDay === "morning" ? "AM" : "PM"}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {step.frequency}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground text-left">
                        {step.completed}/{step.prescribed} completed ({stepPercentage}%)
                      </div>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-3 border-t border-border space-y-3">
                    {/* Prescribed */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">Prescribed</span>
                      <span className="text-sm font-semibold text-foreground">
                        {step.prescribed}
                      </span>
                    </div>

                    {/* Completed Section */}
                    <div className="rounded-md bg-muted/50 p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-foreground">Completed</span>
                        <span className="text-sm font-semibold text-foreground">
                          {step.completed} ({calculatePercentage(step.completed, step.prescribed)}%)
                        </span>
                      </div>
                      <div className="pl-4 space-y-1.5 border-l-2 border-border">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">On-time</span>
                          <span className="font-medium text-foreground">
                            {step.onTime} ({onTimePercentage}%)
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Late</span>
                          <span className="font-medium text-foreground">{step.late}</span>
                        </div>
                      </div>
                    </div>

                    {/* Missed Section */}
                    {step.missed > 0 && (
                      <div className="rounded-md bg-destructive/10 p-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-foreground">Missed</span>
                          <span className="text-sm font-semibold text-destructive">
                            {step.missed} ({calculatePercentage(step.missed, step.prescribed)}%)
                          </span>
                        </div>
                        {step.missedDates && step.missedDates.length > 0 && (
                          <div className="text-xs text-muted-foreground leading-relaxed">
                            {step.missedDates.length <= 8 ? (
                              <div className="flex flex-wrap gap-1">
                                {step.missedDates.map((date, idx) => (
                                  <span key={idx} className="inline-block px-2 py-0.5 bg-destructive/20 rounded text-foreground">
                                    {date}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <>
                                <div className="flex flex-wrap gap-1 mb-1">
                                  {step.missedDates.slice(0, 8).map((date, idx) => (
                                    <span key={idx} className="inline-block px-2 py-0.5 bg-destructive/20 rounded text-foreground">
                                      {date}
                                    </span>
                                  ))}
                                </div>
                                <span className="text-destructive font-medium text-xs">
                                  +{step.missedDates.length - 8} more dates
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

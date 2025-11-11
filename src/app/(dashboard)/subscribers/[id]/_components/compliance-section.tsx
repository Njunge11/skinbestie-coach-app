"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getComplianceStats } from "../compliance-actions/actions";
import type { ComplianceStats } from "../compliance-actions/actions";
import { subDays, subMonths, format, startOfDay, endOfDay } from "date-fns";

type TimePeriod = "week" | "month" | "3mo" | "6mo" | "all";

interface ComplianceSectionProps {
  userId: string;
}

export function ComplianceSection({ userId }: ComplianceSectionProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("week");
  const [complianceData, setComplianceData] = useState<ComplianceStats | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate date range based on selected period
  const getDateRange = (period: TimePeriod): { start: Date; end: Date } => {
    const today = endOfDay(new Date());
    let start: Date;

    switch (period) {
      case "week":
        start = startOfDay(subDays(today, 6)); // Last 7 days
        break;
      case "month":
        start = startOfDay(subDays(today, 29)); // Last 30 days
        break;
      case "3mo":
        start = startOfDay(subMonths(today, 3));
        break;
      case "6mo":
        start = startOfDay(subMonths(today, 6));
        break;
      case "all":
        // Use a far back date to get all data
        start = startOfDay(subMonths(today, 12));
        break;
    }

    return { start, end: today };
  };

  // Fetch compliance data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      const { start, end } = getDateRange(selectedPeriod);
      const result = await getComplianceStats(userId, start, end);

      if (result.success) {
        setComplianceData(result.data);
      } else {
        setError(result.error);
      }
      setIsLoading(false);
    };

    fetchData();
  }, [userId, selectedPeriod]);

  const toggleStep = (stepId: string) => {
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

  const periods: { value: TimePeriod; label: string }[] = [
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "3mo", label: "3mo" },
    { value: "6mo", label: "6mo" },
    { value: "all", label: "All" },
  ];

  // Show loading state with skeleton
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Compliance
            </CardTitle>
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              {periods.map((period) => (
                <button
                  key={period.value}
                  onClick={() => setSelectedPeriod(period.value)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                    selectedPeriod === period.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-4 w-48 bg-muted rounded animate-pulse"></div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Skeleton for 4 Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card
                key={i}
                className={
                  i === 1
                    ? "bg-gradient-to-b from-primary to-primary/90 border-0"
                    : ""
                }
              >
                <CardContent className="p-6">
                  <div className="h-4 w-24 bg-muted/50 rounded mb-2 animate-pulse"></div>
                  <div className="h-10 w-16 bg-muted/50 rounded mb-1 animate-pulse"></div>
                  <div className="h-3 w-20 bg-muted/50 rounded animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Skeleton for AM/PM Split */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-muted/50 p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-muted rounded-md animate-pulse"></div>
                  <div className="h-4 w-16 bg-muted rounded animate-pulse"></div>
                </div>
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="flex justify-between">
                      <div className="h-3 w-20 bg-muted rounded animate-pulse"></div>
                      <div className="h-3 w-12 bg-muted rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Skeleton for Per-step Details */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Per-step Details
            </h4>
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
                        <div className="h-5 w-8 bg-muted rounded animate-pulse"></div>
                      </div>
                      <div className="h-3 w-24 bg-muted rounded animate-pulse"></div>
                    </div>
                  </div>
                  <div className="h-4 w-4 bg-muted rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (error || !complianceData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Compliance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-destructive">
            {error || "Failed to load compliance data"}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate metrics from real data
  const overallCompleted =
    complianceData.overall.onTime + complianceData.overall.late;
  const overallPercentage = calculatePercentage(
    overallCompleted,
    complianceData.overall.prescribed,
  );

  const amPercentage = calculatePercentage(
    complianceData.am.completed,
    complianceData.am.prescribed,
  );

  const pmPercentage = calculatePercentage(
    complianceData.pm.completed,
    complianceData.pm.prescribed,
  );

  // Calculate period display
  const { start, end } = getDateRange(selectedPeriod);
  const periodDisplay = `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Compliance
          </CardTitle>
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {periods.map((period) => (
              <button
                key={period.value}
                onClick={() => setSelectedPeriod(period.value)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                  selectedPeriod === period.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{periodDisplay}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 4 Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Overall Adherence - Primary gradient */}
          <Card className="bg-gradient-to-b from-primary to-primary/90 border-0">
            <CardContent className="p-6 text-primary-foreground">
              <p className="text-sm font-medium opacity-90 mb-2">
                Overall Adherence
              </p>
              <div>
                <div className="text-4xl font-bold mb-1">
                  {overallPercentage}%
                </div>
                <div className="text-sm opacity-75">
                  {overallCompleted}/{complianceData.overall.prescribed}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* On Time - Success green */}
          <Card
            style={{ backgroundColor: "var(--color-skinbestie-success)" }}
            className="border-0"
          >
            <CardContent className="p-6">
              <p className="text-sm font-medium text-foreground/70 mb-2">
                On Time
              </p>
              <div>
                <div className="text-4xl font-bold text-foreground mb-1">
                  {complianceData.overall.onTime}
                </div>
                <p className="text-xs text-foreground/60">
                  Steps completed on schedule
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Late - Warning cream/yellow */}
          <Card
            style={{ backgroundColor: "var(--color-skinbestie-landing-cream)" }}
            className="border-0"
          >
            <CardContent className="p-6">
              <p className="text-sm font-medium text-foreground/70 mb-2">
                Late
              </p>
              <div>
                <div className="text-4xl font-bold text-foreground mb-1">
                  {complianceData.overall.late}
                </div>
                <p className="text-xs text-foreground/60">
                  Steps completed after schedule
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Missed - Light red/pink */}
          <Card
            style={{ backgroundColor: "var(--color-skinbestie-primary-light)" }}
            className="border-0"
          >
            <CardContent className="p-6">
              <p className="text-sm font-medium text-foreground/70 mb-2">
                Missed
              </p>
              <div>
                <div className="text-4xl font-bold text-foreground mb-1">
                  {complianceData.overall.missed}
                </div>
                <p className="text-xs text-foreground/60">
                  Steps not completed
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AM/PM Split */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Morning */}
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-chart-5/20 flex items-center justify-center text-sm">
                ☀️
              </div>
              <span className="text-sm font-semibold text-foreground">
                Morning
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Adherence</span>
                <span className="font-semibold text-foreground">
                  {amPercentage}%
                </span>
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
                    complianceData.am.completed,
                  )}
                  %)
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Late</span>
                <span className="text-foreground/70">
                  {complianceData.am.late}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Missed</span>
                <span className="text-foreground/70">
                  {complianceData.am.missed}
                </span>
              </div>
            </div>
          </div>

          {/* Evening */}
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-chart-3/20 flex items-center justify-center text-sm">
                🌙
              </div>
              <span className="text-sm font-semibold text-foreground">
                Evening
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Adherence</span>
                <span className="font-semibold text-foreground">
                  {pmPercentage}%
                </span>
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
                    complianceData.pm.completed,
                  )}
                  %)
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Late</span>
                <span className="text-foreground/70">
                  {complianceData.pm.late}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Missed</span>
                <span className="text-foreground/70">
                  {complianceData.pm.missed}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Per-step Breakdown */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground mb-3">
            Per-step Details
          </h4>
          {complianceData.steps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No compliance data yet.</p>
              <p className="text-xs mt-1">
                Steps will appear here once they are completed or missed.
              </p>
            </div>
          ) : (
            complianceData.steps.map((step) => {
              const isExpanded = expandedSteps.has(step.routineProductId);
              const stepPercentage = calculatePercentage(
                step.completed,
                step.prescribed,
              );
              const onTimePercentage = calculatePercentage(
                step.onTime,
                step.completed,
              );

              return (
                <div
                  key={step.routineProductId}
                  className="rounded-lg border border-border"
                >
                  <button
                    onClick={() => toggleStep(step.routineProductId)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground">
                            {step.productName}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {step.timeOfDay === "morning" ? "AM" : "PM"}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {step.frequency}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground text-left">
                          {step.completed}/{step.prescribed} completed (
                          {stepPercentage}%)
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
                        <span className="text-sm font-medium text-foreground">
                          Prescribed
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {step.prescribed}
                        </span>
                      </div>

                      {/* Completed Section */}
                      <div className="rounded-md bg-muted/50 p-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-foreground">
                            Completed
                          </span>
                          <span className="text-sm font-semibold text-foreground">
                            {step.completed} (
                            {calculatePercentage(
                              step.completed,
                              step.prescribed,
                            )}
                            %)
                          </span>
                        </div>
                        <div className="pl-4 space-y-1.5 border-l-2 border-border">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">
                              On-time
                            </span>
                            <span className="font-medium text-foreground">
                              {step.onTime} ({onTimePercentage}%)
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Late</span>
                            <span className="font-medium text-foreground">
                              {step.late}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Missed Section */}
                      {step.missed > 0 && (
                        <div className="rounded-md bg-destructive/10 p-3 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-foreground">
                              Missed
                            </span>
                            <span className="text-sm font-semibold text-destructive">
                              {step.missed} (
                              {calculatePercentage(
                                step.missed,
                                step.prescribed,
                              )}
                              %)
                            </span>
                          </div>
                          {step.missedDates && step.missedDates.length > 0 && (
                            <div className="text-xs text-muted-foreground leading-relaxed">
                              {step.missedDates.length <= 8 ? (
                                <div className="flex flex-wrap gap-1">
                                  {step.missedDates.map((date, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-block px-2 py-0.5 bg-destructive/20 rounded text-foreground"
                                    >
                                      {date}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <>
                                  <div className="flex flex-wrap gap-1 mb-1">
                                    {step.missedDates
                                      .slice(0, 8)
                                      .map((date, idx) => (
                                        <span
                                          key={idx}
                                          className="inline-block px-2 py-0.5 bg-destructive/20 rounded text-foreground"
                                        >
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
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

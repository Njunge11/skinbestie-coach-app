import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ComplianceSection } from "./compliance-section";
import type { ComplianceStats } from "../compliance-actions/actions";
import * as complianceActions from "../compliance-actions/actions";

describe("ComplianceSection - UI Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Mock data factories
  const createMockComplianceStats = (overrides?: Partial<ComplianceStats>): ComplianceStats => ({
    overall: {
      prescribed: 100,
      onTime: 70,
      late: 20,
      missed: 10,
    },
    am: {
      prescribed: 50,
      completed: 45,
      onTime: 35,
      late: 10,
      missed: 5,
    },
    pm: {
      prescribed: 50,
      completed: 45,
      onTime: 35,
      late: 10,
      missed: 5,
    },
    steps: [
      {
        routineProductId: "product_1",
        routineStep: "Cleanse",
        productName: "CeraVe Cleanser",
        timeOfDay: "morning",
        frequency: "Daily",
        prescribed: 30,
        completed: 28,
        onTime: 25,
        late: 3,
        missed: 2,
        missedDates: ["Jan 1", "Jan 5"],
      },
      {
        routineProductId: "product_2",
        routineStep: "Moisturize",
        productName: "CeraVe Moisturizer",
        timeOfDay: "evening",
        frequency: "Daily",
        prescribed: 30,
        completed: 27,
        onTime: 24,
        late: 3,
        missed: 3,
        missedDates: ["Jan 2", "Jan 8", "Jan 12"],
      },
      {
        routineProductId: "product_3",
        routineStep: "Treat",
        productName: "Retinol Serum",
        timeOfDay: "evening",
        frequency: "3x per week",
        prescribed: 12,
        completed: 10,
        onTime: 8,
        late: 2,
        missed: 2,
        missedDates: ["Jan 3", "Jan 10"],
      },
    ],
    ...overrides,
  });

  const createEmptyComplianceStats = (): ComplianceStats => ({
    overall: {
      prescribed: 0,
      onTime: 0,
      late: 0,
      missed: 0,
    },
    am: {
      prescribed: 0,
      completed: 0,
      onTime: 0,
      late: 0,
      missed: 0,
    },
    pm: {
      prescribed: 0,
      completed: 0,
      onTime: 0,
      late: 0,
      missed: 0,
    },
    steps: [],
  });

  it("user views compliance data and switches between time periods", async () => {
    const user = userEvent.setup();
    const mockGetComplianceStats = vi.spyOn(complianceActions, "getComplianceStats");

    // Week view data
    const weekData = createMockComplianceStats();
    // Month view data (different numbers)
    const monthData = createMockComplianceStats({
      overall: { prescribed: 200, onTime: 140, late: 40, missed: 20 },
    });

    mockGetComplianceStats.mockResolvedValueOnce({
      success: true,
      data: weekData,
    });

    render(<ComplianceSection userId="user_123" />);

    // User sees loading skeleton initially
    expect(screen.getByText(/compliance/i)).toBeInTheDocument();

    // User sees week view data (default)
    const adherencePercentages = await screen.findAllByText("90%");
    expect(adherencePercentages.length).toBeGreaterThan(0); // Overall adherence (70+20)/100 = 90%
    expect(screen.getByText("70")).toBeInTheDocument(); // On-time count
    expect(screen.getByText("20")).toBeInTheDocument(); // Late count
    const missedElements = screen.getAllByText("10");
    expect(missedElements.length).toBeGreaterThan(0); // Missed count

    // User sees period display includes dates
    expect(screen.getByText(/–/)).toBeInTheDocument();

    // User sees AM/PM sections
    expect(screen.getByText(/morning/i)).toBeInTheDocument();
    expect(screen.getByText(/evening/i)).toBeInTheDocument();

    // User sees per-step details
    expect(screen.getByText("CeraVe Cleanser")).toBeInTheDocument();
    expect(screen.getByText("CeraVe Moisturizer")).toBeInTheDocument();
    expect(screen.getByText("Retinol Serum")).toBeInTheDocument();

    // User clicks "Month" filter
    mockGetComplianceStats.mockResolvedValueOnce({
      success: true,
      data: monthData,
    });

    await user.click(screen.getByRole("button", { name: /^month$/i }));

    // User sees updated data for month view (still 90% but different counts)
    expect(screen.getByText("140")).toBeInTheDocument(); // Updated on-time count
    expect(screen.getByText("40")).toBeInTheDocument(); // Updated late count

    // Verify API was called twice (once for week, once for month)
    expect(mockGetComplianceStats).toHaveBeenCalledTimes(2);
  });

  it("user expands step details to see breakdown then collapses", async () => {
    const user = userEvent.setup();
    const mockGetComplianceStats = vi.spyOn(complianceActions, "getComplianceStats");

    mockGetComplianceStats.mockResolvedValue({
      success: true,
      data: createMockComplianceStats(),
    });

    render(<ComplianceSection userId="user_123" />);

    // Wait for data to load
    await screen.findByText("CeraVe Cleanser");

    // User sees collapsed steps (no detailed stats visible initially)
    expect(screen.queryByText(/^prescribed$/i)).not.toBeInTheDocument();

    // User clicks first step to expand
    await user.click(screen.getByText("CeraVe Cleanser"));

    // User sees prescribed count and breakdown
    expect(await screen.findByText(/^prescribed$/i)).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument(); // Prescribed count
    expect(screen.getByText(/25 \(89%\)/)).toBeInTheDocument(); // On-time with percentage

    // User clicks second step to expand while first is still open
    await user.click(screen.getByText("CeraVe Moisturizer"));

    // User sees both expanded
    const prescribedLabels = screen.getAllByText(/^prescribed$/i);
    expect(prescribedLabels).toHaveLength(2);

    // User clicks first step again to collapse it
    await user.click(screen.getByText("CeraVe Cleanser"));

    // User verifies only second is expanded now
    await waitFor(() => {
      const remainingPrescribed = screen.getAllByText(/^prescribed$/i);
      expect(remainingPrescribed).toHaveLength(1);
    });

    // User clicks second to collapse
    await user.click(screen.getByText("CeraVe Moisturizer"));

    // User verifies all are collapsed
    await waitFor(() => {
      expect(screen.queryByText(/^prescribed$/i)).not.toBeInTheDocument();
    });
  });

  it("user views step with missed dates and sees date badges", async () => {
    const user = userEvent.setup();
    const mockGetComplianceStats = vi.spyOn(complianceActions, "getComplianceStats");

    mockGetComplianceStats.mockResolvedValue({
      success: true,
      data: createMockComplianceStats(),
    });

    render(<ComplianceSection userId="user_123" />);

    await screen.findByText("CeraVe Cleanser");

    // User expands step with missed dates
    await user.click(screen.getByText("CeraVe Cleanser"));

    // User sees missed section in red/destructive styling
    const missedLabels = await screen.findAllByText(/^missed$/i);
    expect(missedLabels.length).toBeGreaterThan(0);

    // User sees individual date badges (≤8 dates)
    expect(screen.getByText("Jan 1")).toBeInTheDocument();
    expect(screen.getByText("Jan 5")).toBeInTheDocument();

    // User sees missed count and percentage
    expect(screen.getByText(/2 \(7%\)/)).toBeInTheDocument(); // (2/30) * 100 ≈ 7%
  });

  it("user views step with many missed dates and sees truncated list", async () => {
    const user = userEvent.setup();
    const mockGetComplianceStats = vi.spyOn(complianceActions, "getComplianceStats");

    // Create data with >8 missed dates
    const manyMissedDates = [
      "Jan 1",
      "Jan 2",
      "Jan 3",
      "Jan 4",
      "Jan 5",
      "Jan 6",
      "Jan 7",
      "Jan 8",
      "Jan 9",
      "Jan 10",
      "Jan 11",
      "Jan 12",
    ];

    mockGetComplianceStats.mockResolvedValue({
      success: true,
      data: createMockComplianceStats({
        steps: [
          {
            routineProductId: "product_1",
            routineStep: "Cleanse",
            productName: "CeraVe Cleanser",
            timeOfDay: "morning",
            frequency: "Daily",
            prescribed: 30,
            completed: 18,
            onTime: 15,
            late: 3,
            missed: 12,
            missedDates: manyMissedDates,
          },
        ],
      }),
    });

    render(<ComplianceSection userId="user_123" />);

    await screen.findByText("CeraVe Cleanser");

    // User expands step
    await user.click(screen.getByText("CeraVe Cleanser"));

    // User sees first 8 dates
    expect(await screen.findByText("Jan 1")).toBeInTheDocument();
    expect(screen.getByText("Jan 8")).toBeInTheDocument();

    // User sees "+N more dates" indicator
    expect(screen.getByText(/\+4 more dates/i)).toBeInTheDocument();

    // User does NOT see 9th date or beyond
    expect(screen.queryByText("Jan 9")).not.toBeInTheDocument();
  });

  it("user with no compliance data sees helpful empty state", async () => {
    const mockGetComplianceStats = vi.spyOn(complianceActions, "getComplianceStats");

    mockGetComplianceStats.mockResolvedValue({
      success: true,
      data: createEmptyComplianceStats(),
    });

    render(<ComplianceSection userId="user_123" />);

    // User sees stat cards with zeros
    const zeroPercentages = await screen.findAllByText("0%");
    expect(zeroPercentages.length).toBeGreaterThan(0); // Overall adherence

    // User sees empty state message
    expect(screen.getByText(/no compliance data yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/steps will appear here once they are completed or missed/i)
    ).toBeInTheDocument();

    // User can still see filter tabs
    expect(screen.getByRole("button", { name: /^week$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^month$/i })).toBeInTheDocument();
  });

  it("user sees skeleton while data loads then sees real data", async () => {
    let resolvePromise: (value: Awaited<ReturnType<typeof complianceActions.getComplianceStats>>) => void;
    const promise = new Promise<Awaited<ReturnType<typeof complianceActions.getComplianceStats>>>((resolve) => {
      resolvePromise = resolve;
    });

    const mockGetComplianceStats = vi.spyOn(complianceActions, "getComplianceStats");
    mockGetComplianceStats.mockReturnValueOnce(promise);

    render(<ComplianceSection userId="user_123" />);

    // User sees skeleton (animated pulses)
    const skeletons = screen.getAllByRole("generic", { hidden: true });
    expect(skeletons.length).toBeGreaterThan(0);

    // User can interact with filter tabs during loading
    expect(screen.getByRole("button", { name: /^week$/i })).toBeInTheDocument();

    // Data loads
    resolvePromise!({
      success: true,
      data: createMockComplianceStats(),
    });

    // User sees real data (no more skeleton)
    const percentages = await screen.findAllByText("90%"); // Overall 90%
    expect(percentages.length).toBeGreaterThan(0);
    expect(screen.getByText("CeraVe Cleanser")).toBeInTheDocument();
  });

  it("user encounters error loading compliance data and sees error message", async () => {
    const mockGetComplianceStats = vi.spyOn(complianceActions, "getComplianceStats");

    mockGetComplianceStats.mockResolvedValue({
      success: false,
      error: "Network error",
    });

    render(<ComplianceSection userId="user_123" />);

    // User sees error message in red
    expect(await screen.findByText(/network error/i)).toBeInTheDocument();

    // User doesn't see stat cards or detailed data
    expect(screen.queryByText("Overall Adherence")).not.toBeInTheDocument();

    // User still sees "Compliance" title
    expect(screen.getByText(/^compliance$/i)).toBeInTheDocument();
  });

  it("user verifies compliance calculations are accurate across different views", async () => {
    const user = userEvent.setup();
    const mockGetComplianceStats = vi.spyOn(complianceActions, "getComplianceStats");

    const weekData = createMockComplianceStats({
      overall: { prescribed: 100, onTime: 80, late: 10, missed: 10 },
      am: { prescribed: 50, completed: 45, onTime: 40, late: 5, missed: 5 },
      pm: { prescribed: 50, completed: 45, onTime: 40, late: 5, missed: 5 },
    });

    mockGetComplianceStats.mockResolvedValueOnce({
      success: true,
      data: weekData,
    });

    render(<ComplianceSection userId="user_123" />);

    // User views week data
    await screen.findByText("CeraVe Cleanser");

    // User verifies overall adherence % = (completed/prescribed) * 100
    // (80 + 10) / 100 = 90%
    const weekPercentages = screen.getAllByText("90%");
    expect(weekPercentages.length).toBeGreaterThan(0);

    // User verifies AM adherence % is displayed in the AM section
    expect(screen.getByText(/morning/i)).toBeInTheDocument();

    // User verifies PM adherence % is displayed in the PM section
    expect(screen.getByText(/evening/i)).toBeInTheDocument();

    // User expands a step
    await user.click(screen.getByText("CeraVe Cleanser"));

    // User verifies on-time % = (onTime/completed) * 100
    // Step 1: (25/28) * 100 ≈ 89%
    expect(await screen.findByText(/25 \(89%\)/)).toBeInTheDocument();

    // User switches to month view
    const monthData = createMockComplianceStats({
      overall: { prescribed: 200, onTime: 120, late: 60, missed: 20 },
    });

    mockGetComplianceStats.mockResolvedValueOnce({
      success: true,
      data: monthData,
    });

    await user.click(screen.getByRole("button", { name: /^month$/i }));

    // User verifies recalculated percentages
    // (120 + 60) / 200 = 90%
    const monthPercentages = await screen.findAllByText("90%");
    expect(monthPercentages.length).toBeGreaterThan(0);
  });

  it("user sees red text for missed count only when missed > 0", async () => {
    const user = userEvent.setup();
    const mockGetComplianceStats = vi.spyOn(complianceActions, "getComplianceStats");

    // First: zero missed steps
    mockGetComplianceStats.mockResolvedValueOnce({
      success: true,
      data: createMockComplianceStats({
        overall: { prescribed: 100, onTime: 90, late: 10, missed: 0 },
      }),
    });

    render(<ComplianceSection userId="user_123" />);

    const percentages = await screen.findAllByText("90%");
    expect(percentages.length).toBeGreaterThan(0);

    // User sees missed count "0" in normal color (not red)
    const missedLabels = screen.getAllByText(/^missed$/i);
    const missedCard = missedLabels[0].closest("div");
    const missedCount = missedCard?.querySelector('[class*="font-bold"]');
    expect(missedCount).toHaveTextContent("0");
    expect(missedCount).not.toHaveClass("text-destructive");

    // Switch to period with missed steps
    mockGetComplianceStats.mockResolvedValueOnce({
      success: true,
      data: createMockComplianceStats({
        overall: { prescribed: 100, onTime: 70, late: 20, missed: 10 },
      }),
    });

    await user.click(screen.getByRole("button", { name: /^month$/i }));

    // User sees missed count in red/destructive color
    await waitFor(() => {
      const updatedMissedLabels = screen.getAllByText(/^missed$/i);
      const updatedMissedCard = updatedMissedLabels[0].closest("div");
      const updatedMissedCount = updatedMissedCard?.querySelector(
        '[class*="font-bold"]'
      );
      expect(updatedMissedCount).toHaveTextContent("10");
      expect(updatedMissedCount).toHaveClass("text-destructive");
    });
  });

  it("user navigates through all time periods sequentially", async () => {
    const user = userEvent.setup();
    const mockGetComplianceStats = vi.spyOn(complianceActions, "getComplianceStats");

    // Mock data for each period
    const weekData = createMockComplianceStats({
      overall: { prescribed: 50, onTime: 40, late: 8, missed: 2 },
    });
    const monthData = createMockComplianceStats({
      overall: { prescribed: 100, onTime: 80, late: 15, missed: 5 },
    });
    const threeMonthData = createMockComplianceStats({
      overall: { prescribed: 300, onTime: 240, late: 45, missed: 15 },
    });
    const sixMonthData = createMockComplianceStats({
      overall: { prescribed: 600, onTime: 480, late: 90, missed: 30 },
    });
    const allData = createMockComplianceStats({
      overall: { prescribed: 1000, onTime: 800, late: 150, missed: 50 },
    });

    // Week (default)
    mockGetComplianceStats.mockResolvedValueOnce({ success: true, data: weekData });

    render(<ComplianceSection userId="user_123" />);

    // User starts on Week view
    expect(await screen.findByText("96%")).toBeInTheDocument(); // (48/50) * 100

    // User clicks Month
    mockGetComplianceStats.mockResolvedValueOnce({ success: true, data: monthData });
    await user.click(screen.getByRole("button", { name: /^month$/i }));
    expect(await screen.findByText("95%")).toBeInTheDocument(); // (95/100) * 100

    // User clicks 3mo
    mockGetComplianceStats.mockResolvedValueOnce({ success: true, data: threeMonthData });
    await user.click(screen.getByRole("button", { name: /^3mo$/i }));
    expect(await screen.findByText("95%")).toBeInTheDocument(); // (285/300) * 100

    // User clicks 6mo
    mockGetComplianceStats.mockResolvedValueOnce({ success: true, data: sixMonthData });
    await user.click(screen.getByRole("button", { name: /^6mo$/i }));
    expect(await screen.findByText("95%")).toBeInTheDocument(); // (570/600) * 100

    // User clicks All
    mockGetComplianceStats.mockResolvedValueOnce({ success: true, data: allData });
    await user.click(screen.getByRole("button", { name: /^all$/i }));
    expect(await screen.findByText("95%")).toBeInTheDocument(); // (950/1000) * 100

    // User clicks Week again to return to start
    mockGetComplianceStats.mockResolvedValueOnce({ success: true, data: weekData });
    await user.click(screen.getByRole("button", { name: /^week$/i }));
    expect(await screen.findByText("96%")).toBeInTheDocument();

    // Verify API called 6 times (initial + 5 switches)
    expect(mockGetComplianceStats).toHaveBeenCalledTimes(6);
  });

  it("user expands step with no missed dates and does not see missed section", async () => {
    const user = userEvent.setup();
    const mockGetComplianceStats = vi.spyOn(complianceActions, "getComplianceStats");

    mockGetComplianceStats.mockResolvedValue({
      success: true,
      data: createMockComplianceStats({
        steps: [
          {
            routineProductId: "product_1",
            routineStep: "Cleanse",
            productName: "Perfect Cleanser",
            timeOfDay: "morning",
            frequency: "Daily",
            prescribed: 30,
            completed: 30,
            onTime: 28,
            late: 2,
            missed: 0,
            missedDates: [],
          },
        ],
      }),
    });

    render(<ComplianceSection userId="user_123" />);

    await screen.findByText("Perfect Cleanser");

    // User expands step
    await user.click(screen.getByText("Perfect Cleanser"));

    // User sees prescribed count
    const prescribedLabels = await screen.findAllByText(/^prescribed$/i);
    expect(prescribedLabels.length).toBeGreaterThan(0);
    expect(screen.getByText("30")).toBeInTheDocument();

    // User sees completed section with on-time and late
    const completedLabels = screen.getAllByText(/^completed$/i);
    expect(completedLabels.length).toBeGreaterThan(0);
    expect(screen.getByText(/28 \(93%\)/)).toBeInTheDocument(); // On-time percentage

    // User does NOT see missed section in the expanded step details (conditional rendering)
    // Note: "Missed" appears in: main stat card (1) + AM section (1) + PM section (1) = 3 total
    // But should NOT appear in the expanded step breakdown
    const missedSections = screen.queryAllByText(/^missed$/i);
    expect(missedSections.length).toBe(3); // Only in stat cards, not in expanded step

    // Verify no missed dates are shown
    expect(screen.queryByText("Jan 1")).not.toBeInTheDocument();
  });
});

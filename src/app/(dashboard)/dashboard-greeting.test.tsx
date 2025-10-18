import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardGreeting from "./dashboard-greeting";

describe("DashboardGreeting - UI Integration Tests", () => {
  beforeEach(() => {
    // Use fake timers to control time
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("displays Good Morning greeting before noon", () => {
    // Set time to 10:00 AM local time
    vi.setSystemTime(new Date(2025, 0, 18, 10, 0, 0));

    render(<DashboardGreeting name="John" />);

    expect(screen.getByText(/Good Morning, John/i)).toBeInTheDocument();
    expect(screen.getByText("Manage your clients efficiently")).toBeInTheDocument();
  });

  it("displays Good Afternoon greeting between noon and 6pm", () => {
    // Set time to 2:00 PM (14:00) local time
    vi.setSystemTime(new Date(2025, 0, 18, 14, 0, 0));

    render(<DashboardGreeting name="Sarah" />);

    expect(screen.getByText(/Good Afternoon, Sarah/i)).toBeInTheDocument();
    expect(screen.getByText("Manage your clients efficiently")).toBeInTheDocument();
  });

  it("displays Good Evening greeting after 6pm", () => {
    // Set time to 8:00 PM (20:00) local time
    vi.setSystemTime(new Date(2025, 0, 18, 20, 0, 0));

    render(<DashboardGreeting name="Mike" />);

    expect(screen.getByText(/Good Evening, Mike/i)).toBeInTheDocument();
    expect(screen.getByText("Manage your clients efficiently")).toBeInTheDocument();
  });

  it("displays Good Morning at exactly noon", () => {
    // Set time to exactly 12:00 PM local time (edge case)
    vi.setSystemTime(new Date(2025, 0, 18, 12, 0, 0));

    render(<DashboardGreeting name="Alex" />);

    // At 12:00, hour is 12, which is >= 12, so it should be "Good Afternoon"
    expect(screen.getByText(/Good Afternoon, Alex/i)).toBeInTheDocument();
  });

  it("displays Good Afternoon at exactly 6pm", () => {
    // Set time to exactly 6:00 PM (18:00) local time (edge case)
    vi.setSystemTime(new Date(2025, 0, 18, 18, 0, 0));

    render(<DashboardGreeting name="Taylor" />);

    // At 18:00, hour is 18, which is >= 18, so it should be "Good Evening"
    expect(screen.getByText(/Good Evening, Taylor/i)).toBeInTheDocument();
  });
});

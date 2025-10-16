import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GoalsSection } from "./goals-section";
import type { Goal } from "../types";

describe("GoalsSection - UI Tests", () => {
  // Mock server actions at the network boundary
  const mockOnAddGoal = vi.fn();
  const mockOnUpdateGoal = vi.fn();
  const mockOnToggleGoal = vi.fn();
  const mockOnDeleteGoal = vi.fn();
  const mockOnReorderGoals = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("user adds a new goal with all fields", async () => {
    const user = userEvent.setup();

    render(
      <GoalsSection
        goals={[]}
        onAddGoal={mockOnAddGoal}
        onUpdateGoal={mockOnUpdateGoal}
        onToggleGoal={mockOnToggleGoal}
        onDeleteGoal={mockOnDeleteGoal}
        onReorderGoals={mockOnReorderGoals}
      />
    );

    // User sees empty state
    expect(screen.getByText(/no goals set yet/i)).toBeInTheDocument();

    // User clicks Add Goal button
    await user.click(screen.getByRole("button", { name: /add goal/i }));

    // User fills in goal name
    await user.type(screen.getByPlaceholderText(/goal name/i), "Clear skin");

    // User fills in description
    await user.type(
      screen.getByPlaceholderText(/description/i),
      "Reduce acne and dark spots"
    );

    // User fills in timeframe
    await user.type(screen.getByPlaceholderText(/timeframe/i), "12 weeks");

    // User clicks Add Goal button
    await user.click(screen.getByRole("button", { name: /add goal/i }));

    // Server action called with correct data
    expect(mockOnAddGoal).toHaveBeenCalledWith({
      name: "Clear skin",
      description: "Reduce acne and dark spots",
      timeframe: "12 weeks",
    });
  });

  it("user cancels adding a new goal", async () => {
    const user = userEvent.setup();

    render(
      <GoalsSection
        goals={[]}
        onAddGoal={mockOnAddGoal}
        onUpdateGoal={mockOnUpdateGoal}
        onToggleGoal={mockOnToggleGoal}
        onDeleteGoal={mockOnDeleteGoal}
        onReorderGoals={mockOnReorderGoals}
      />
    );

    // User clicks Add Goal
    await user.click(screen.getByRole("button", { name: /add goal/i }));

    // User types something
    await user.type(screen.getByPlaceholderText(/goal name/i), "Test goal");

    // User clicks Cancel
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    // Server action not called
    expect(mockOnAddGoal).not.toHaveBeenCalled();

    // User sees empty state again
    expect(screen.getByText(/no goals set yet/i)).toBeInTheDocument();
  });

  it("user edits an existing goal", async () => {
    const user = userEvent.setup();

    const existingGoals: Goal[] = [
      {
        id: "goal_1",
        name: "Clear skin",
        description: "Old description",
        timeframe: "8 weeks",
        complete: false,
      },
    ];

    render(
      <GoalsSection
        goals={existingGoals}
        onAddGoal={mockOnAddGoal}
        onUpdateGoal={mockOnUpdateGoal}
        onToggleGoal={mockOnToggleGoal}
        onDeleteGoal={mockOnDeleteGoal}
        onReorderGoals={mockOnReorderGoals}
      />
    );

    // User sees existing goal
    expect(screen.getByText("Clear skin")).toBeInTheDocument();
    expect(screen.getByText("Old description")).toBeInTheDocument();

    // User clicks on goal to edit
    await user.click(screen.getByText("Clear skin"));

    // User sees input fields with current values
    expect(screen.getByDisplayValue("Clear skin")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Old description")).toBeInTheDocument();

    // User updates description
    const descInput = screen.getByPlaceholderText(/description/i);
    await user.clear(descInput);
    await user.type(descInput, "New description");

    // User updates timeframe
    const timeframeInput = screen.getByPlaceholderText(/timeframe/i);
    await user.clear(timeframeInput);
    await user.type(timeframeInput, "12 weeks");

    // User clicks Save
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Server action called
    expect(mockOnUpdateGoal).toHaveBeenCalledWith("goal_1", {
      name: "Clear skin",
      description: "New description",
      timeframe: "12 weeks",
    });
  });

  it("user cancels editing a goal", async () => {
    const user = userEvent.setup();

    const existingGoals: Goal[] = [
      {
        id: "goal_1",
        name: "Clear skin",
        description: "Original description",
        timeframe: "8 weeks",
        complete: false,
      },
    ];

    render(
      <GoalsSection
        goals={existingGoals}
        onAddGoal={mockOnAddGoal}
        onUpdateGoal={mockOnUpdateGoal}
        onToggleGoal={mockOnToggleGoal}
        onDeleteGoal={mockOnDeleteGoal}
        onReorderGoals={mockOnReorderGoals}
      />
    );

    // User clicks on goal to edit
    await user.click(screen.getByText("Clear skin"));

    // User makes changes
    const descInput = screen.getByPlaceholderText(/description/i);
    await user.clear(descInput);
    await user.type(descInput, "Changed description");

    // User clicks Cancel
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    // Server action not called
    expect(mockOnUpdateGoal).not.toHaveBeenCalled();

    // User sees original values
    expect(screen.getByText("Original description")).toBeInTheDocument();
  });

  it("user toggles goal completion status", async () => {
    const user = userEvent.setup();

    const existingGoals: Goal[] = [
      {
        id: "goal_1",
        name: "Clear skin",
        description: "Reduce acne",
        timeframe: "8 weeks",
        complete: false,
      },
    ];

    render(
      <GoalsSection
        goals={existingGoals}
        onAddGoal={mockOnAddGoal}
        onUpdateGoal={mockOnUpdateGoal}
        onToggleGoal={mockOnToggleGoal}
        onDeleteGoal={mockOnDeleteGoal}
        onReorderGoals={mockOnReorderGoals}
      />
    );

    // User clicks checkbox to mark complete
    await user.click(
      screen.getByRole("button", { name: /mark as complete/i })
    );

    // Server action called
    expect(mockOnToggleGoal).toHaveBeenCalledWith("goal_1");
  });

  it("user deletes a goal", async () => {
    const user = userEvent.setup();

    const existingGoals: Goal[] = [
      {
        id: "goal_1",
        name: "Clear skin",
        description: "Reduce acne",
        timeframe: "8 weeks",
        complete: false,
      },
    ];

    render(
      <GoalsSection
        goals={existingGoals}
        onAddGoal={mockOnAddGoal}
        onUpdateGoal={mockOnUpdateGoal}
        onToggleGoal={mockOnToggleGoal}
        onDeleteGoal={mockOnDeleteGoal}
        onReorderGoals={mockOnReorderGoals}
      />
    );

    // User sees the goal
    expect(screen.getByText("Clear skin")).toBeInTheDocument();

    // User clicks delete button
    await user.click(screen.getByRole("button", { name: /delete goal/i }));

    // Server action called
    expect(mockOnDeleteGoal).toHaveBeenCalledWith("goal_1");
  });

  it("user adds multiple goals and sees them in order", async () => {
    const user = userEvent.setup();

    const existingGoals: Goal[] = [
      {
        id: "goal_1",
        name: "Clear skin",
        description: "First goal",
        timeframe: "8 weeks",
        complete: false,
      },
    ];

    render(
      <GoalsSection
        goals={existingGoals}
        onAddGoal={mockOnAddGoal}
        onUpdateGoal={mockOnUpdateGoal}
        onToggleGoal={mockOnToggleGoal}
        onDeleteGoal={mockOnDeleteGoal}
        onReorderGoals={mockOnReorderGoals}
      />
    );

    // User sees existing goal
    expect(screen.getByText("Clear skin")).toBeInTheDocument();

    // User clicks Add Another Goal
    await user.click(screen.getByRole("button", { name: /add another goal/i }));

    // User fills in second goal
    await user.type(screen.getByPlaceholderText(/goal name/i), "Even tone");
    await user.type(
      screen.getByPlaceholderText(/description/i),
      "Fade dark spots"
    );
    await user.type(screen.getByPlaceholderText(/timeframe/i), "10 weeks");

    // User saves second goal
    await user.click(screen.getByRole("button", { name: /add goal/i }));

    // Server action called
    expect(mockOnAddGoal).toHaveBeenCalledWith({
      name: "Even tone",
      description: "Fade dark spots",
      timeframe: "10 weeks",
    });
  });

  it("user sees numbered badges for goal priority", () => {
    const existingGoals: Goal[] = [
      {
        id: "goal_1",
        name: "First goal",
        description: "Priority 1",
        timeframe: "8 weeks",
        complete: false,
      },
      {
        id: "goal_2",
        name: "Second goal",
        description: "Priority 2",
        timeframe: "10 weeks",
        complete: false,
      },
      {
        id: "goal_3",
        name: "Third goal",
        description: "Priority 3",
        timeframe: "12 weeks",
        complete: false,
      },
    ];

    render(
      <GoalsSection
        goals={existingGoals}
        onAddGoal={mockOnAddGoal}
        onUpdateGoal={mockOnUpdateGoal}
        onToggleGoal={mockOnToggleGoal}
        onDeleteGoal={mockOnDeleteGoal}
        onReorderGoals={mockOnReorderGoals}
      />
    );

    // User sees numbered priorities
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();

    // User sees all goals
    expect(screen.getByText("First goal")).toBeInTheDocument();
    expect(screen.getByText("Second goal")).toBeInTheDocument();
    expect(screen.getByText("Third goal")).toBeInTheDocument();
  });

  it("user cannot add goal with empty description", async () => {
    const user = userEvent.setup();

    render(
      <GoalsSection
        goals={[]}
        onAddGoal={mockOnAddGoal}
        onUpdateGoal={mockOnUpdateGoal}
        onToggleGoal={mockOnToggleGoal}
        onDeleteGoal={mockOnDeleteGoal}
        onReorderGoals={mockOnReorderGoals}
      />
    );

    // User clicks Add Goal
    await user.click(screen.getByRole("button", { name: /add goal/i }));

    // User fills in name and timeframe but not description
    await user.type(screen.getByPlaceholderText(/goal name/i), "Clear skin");
    await user.type(screen.getByPlaceholderText(/timeframe/i), "12 weeks");

    // User tries to add goal
    await user.click(screen.getByRole("button", { name: /add goal/i }));

    // Server action not called because description is empty
    expect(mockOnAddGoal).not.toHaveBeenCalled();
  });

  it("user cannot add goal with empty timeframe", async () => {
    const user = userEvent.setup();

    render(
      <GoalsSection
        goals={[]}
        onAddGoal={mockOnAddGoal}
        onUpdateGoal={mockOnUpdateGoal}
        onToggleGoal={mockOnToggleGoal}
        onDeleteGoal={mockOnDeleteGoal}
        onReorderGoals={mockOnReorderGoals}
      />
    );

    // User clicks Add Goal
    await user.click(screen.getByRole("button", { name: /add goal/i }));

    // User fills in name and description but not timeframe
    await user.type(screen.getByPlaceholderText(/goal name/i), "Clear skin");
    await user.type(
      screen.getByPlaceholderText(/description/i),
      "Reduce acne"
    );

    // User tries to add goal
    await user.click(screen.getByRole("button", { name: /add goal/i }));

    // Server action not called because timeframe is empty
    expect(mockOnAddGoal).not.toHaveBeenCalled();
  });

  it("user cannot add goal with empty name", async () => {
    const user = userEvent.setup();

    render(
      <GoalsSection
        goals={[]}
        onAddGoal={mockOnAddGoal}
        onUpdateGoal={mockOnUpdateGoal}
        onToggleGoal={mockOnToggleGoal}
        onDeleteGoal={mockOnDeleteGoal}
        onReorderGoals={mockOnReorderGoals}
      />
    );

    // User clicks Add Goal
    await user.click(screen.getByRole("button", { name: /add goal/i }));

    // User fills in description and timeframe but not name
    await user.type(
      screen.getByPlaceholderText(/description/i),
      "Reduce acne"
    );
    await user.type(screen.getByPlaceholderText(/timeframe/i), "12 weeks");

    // User tries to add goal
    await user.click(screen.getByRole("button", { name: /add goal/i }));

    // Server action not called because name is empty
    expect(mockOnAddGoal).not.toHaveBeenCalled();
  });

  it("user cannot add goal with whitespace-only fields", async () => {
    const user = userEvent.setup();

    render(
      <GoalsSection
        goals={[]}
        onAddGoal={mockOnAddGoal}
        onUpdateGoal={mockOnUpdateGoal}
        onToggleGoal={mockOnToggleGoal}
        onDeleteGoal={mockOnDeleteGoal}
        onReorderGoals={mockOnReorderGoals}
      />
    );

    // User clicks Add Goal
    await user.click(screen.getByRole("button", { name: /add goal/i }));

    // User fills in fields with only whitespace
    await user.type(screen.getByPlaceholderText(/goal name/i), "   ");
    await user.type(screen.getByPlaceholderText(/description/i), "   ");
    await user.type(screen.getByPlaceholderText(/timeframe/i), "   ");

    // User tries to add goal
    await user.click(screen.getByRole("button", { name: /add goal/i }));

    // Server action not called because fields are only whitespace
    expect(mockOnAddGoal).not.toHaveBeenCalled();
  });

  it("user cannot edit goal with empty description", async () => {
    const user = userEvent.setup();

    const existingGoals: Goal[] = [
      {
        id: "goal_1",
        name: "Clear skin",
        description: "Original description",
        timeframe: "8 weeks",
        complete: false,
      },
    ];

    render(
      <GoalsSection
        goals={existingGoals}
        onAddGoal={mockOnAddGoal}
        onUpdateGoal={mockOnUpdateGoal}
        onToggleGoal={mockOnToggleGoal}
        onDeleteGoal={mockOnDeleteGoal}
        onReorderGoals={mockOnReorderGoals}
      />
    );

    // User clicks on goal to edit
    await user.click(screen.getByText("Clear skin"));

    // User clears description
    const descInput = screen.getByPlaceholderText(/description/i);
    await user.clear(descInput);

    // User tries to save
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Server action not called because description is empty
    expect(mockOnUpdateGoal).not.toHaveBeenCalled();
  });

  it("user cannot edit goal with empty timeframe", async () => {
    const user = userEvent.setup();

    const existingGoals: Goal[] = [
      {
        id: "goal_1",
        name: "Clear skin",
        description: "Description",
        timeframe: "8 weeks",
        complete: false,
      },
    ];

    render(
      <GoalsSection
        goals={existingGoals}
        onAddGoal={mockOnAddGoal}
        onUpdateGoal={mockOnUpdateGoal}
        onToggleGoal={mockOnToggleGoal}
        onDeleteGoal={mockOnDeleteGoal}
        onReorderGoals={mockOnReorderGoals}
      />
    );

    // User clicks on goal to edit
    await user.click(screen.getByText("Clear skin"));

    // User clears timeframe
    const timeframeInput = screen.getByPlaceholderText(/timeframe/i);
    await user.clear(timeframeInput);

    // User tries to save
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Server action not called because timeframe is empty
    expect(mockOnUpdateGoal).not.toHaveBeenCalled();
  });

  it("user cannot edit goal with empty name", async () => {
    const user = userEvent.setup();

    const existingGoals: Goal[] = [
      {
        id: "goal_1",
        name: "Clear skin",
        description: "Description",
        timeframe: "8 weeks",
        complete: false,
      },
    ];

    render(
      <GoalsSection
        goals={existingGoals}
        onAddGoal={mockOnAddGoal}
        onUpdateGoal={mockOnUpdateGoal}
        onToggleGoal={mockOnToggleGoal}
        onDeleteGoal={mockOnDeleteGoal}
        onReorderGoals={mockOnReorderGoals}
      />
    );

    // User clicks on goal to edit
    await user.click(screen.getByText("Clear skin"));

    // User clears name
    const nameInput = screen.getByDisplayValue("Clear skin");
    await user.clear(nameInput);

    // User tries to save
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Server action not called because name is empty
    expect(mockOnUpdateGoal).not.toHaveBeenCalled();
  });

  it("user completes full workflow: add, edit, complete, and delete goals", async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <GoalsSection
        goals={[]}
        onAddGoal={mockOnAddGoal}
        onUpdateGoal={mockOnUpdateGoal}
        onToggleGoal={mockOnToggleGoal}
        onDeleteGoal={mockOnDeleteGoal}
        onReorderGoals={mockOnReorderGoals}
      />
    );

    // Step 1: User adds first goal
    await user.click(screen.getByRole("button", { name: /add goal/i }));
    await user.type(screen.getByPlaceholderText(/goal name/i), "Clear skin");
    await user.type(
      screen.getByPlaceholderText(/description/i),
      "Reduce breakouts"
    );
    await user.type(screen.getByPlaceholderText(/timeframe/i), "12 weeks");
    await user.click(screen.getByRole("button", { name: /add goal/i }));

    expect(mockOnAddGoal).toHaveBeenCalledTimes(1);

    // Simulate goal being added to UI
    rerender(
      <GoalsSection
        goals={[
          {
            id: "goal_1",
            name: "Clear skin",
            description: "Reduce breakouts",
            timeframe: "12 weeks",
            complete: false,
          },
        ]}
        onAddGoal={mockOnAddGoal}
        onUpdateGoal={mockOnUpdateGoal}
        onToggleGoal={mockOnToggleGoal}
        onDeleteGoal={mockOnDeleteGoal}
        onReorderGoals={mockOnReorderGoals}
      />
    );

    // Step 2: User adds second goal
    await user.click(screen.getByRole("button", { name: /add another goal/i }));
    await user.type(screen.getByPlaceholderText(/goal name/i), "Even tone");
    await user.type(
      screen.getByPlaceholderText(/description/i),
      "Fade dark spots"
    );
    await user.type(screen.getByPlaceholderText(/timeframe/i), "8 weeks");
    await user.click(screen.getByRole("button", { name: /add goal/i }));

    expect(mockOnAddGoal).toHaveBeenCalledTimes(2);

    // Simulate both goals in UI
    rerender(
      <GoalsSection
        goals={[
          {
            id: "goal_1",
            name: "Clear skin",
            description: "Reduce breakouts",
            timeframe: "12 weeks",
            complete: false,
          },
          {
            id: "goal_2",
            name: "Even tone",
            description: "Fade dark spots",
            timeframe: "8 weeks",
            complete: false,
          },
        ]}
        onAddGoal={mockOnAddGoal}
        onUpdateGoal={mockOnUpdateGoal}
        onToggleGoal={mockOnToggleGoal}
        onDeleteGoal={mockOnDeleteGoal}
        onReorderGoals={mockOnReorderGoals}
      />
    );

    // Step 3: User edits first goal
    await user.click(screen.getByText("Clear skin"));
    const nameInput = screen.getByDisplayValue("Clear skin");
    await user.clear(nameInput);
    await user.type(nameInput, "Clear and smooth skin");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(mockOnUpdateGoal).toHaveBeenCalledWith("goal_1", {
      name: "Clear and smooth skin",
      description: "Reduce breakouts",
      timeframe: "12 weeks",
    });

    // Step 4: User completes second goal
    const checkboxes = screen.getAllByRole("button", {
      name: /mark as complete/i,
    });
    await user.click(checkboxes[1]);

    expect(mockOnToggleGoal).toHaveBeenCalledWith("goal_2");

    // Step 5: User deletes first goal
    const deleteButtons = screen.getAllByRole("button", {
      name: /delete goal/i,
    });
    await user.click(deleteButtons[0]);

    expect(mockOnDeleteGoal).toHaveBeenCalledWith("goal_1");
  });
});

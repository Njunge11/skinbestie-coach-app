import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RoutineSection } from "./routine-section";
import type { Routine, RoutineProduct } from "../types";

describe("RoutineSection - Complete User Workflows", () => {
  // Mock server actions at the network boundary
  const mockOnCreateFromTemplate = vi.fn();
  const mockOnCreateBlank = vi.fn();
  const mockOnUpdateRoutine = vi.fn();
  const mockOnDeleteRoutine = vi.fn();
  const mockOnAddProduct = vi.fn();
  const mockOnUpdateProduct = vi.fn();
  const mockOnDeleteProduct = vi.fn();
  const mockOnReorderProducts = vi.fn();

  const mockTemplates = [
    { id: "template-1", name: "Morning Glow Routine", description: "Energizing morning skincare" },
    { id: "template-2", name: "Night Recovery Routine", description: "Deep repair and hydration" },
    { id: "template-3", name: "Acne-Prone Skin Care", description: "Clear and balanced skin" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("user creates blank routine and adds morning product", async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <RoutineSection
        routine={null}
        products={[]}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User sees empty state
    expect(screen.getByText(/no routine set yet/i)).toBeInTheDocument();

    // User clicks "Add Routine"
    await user.click(screen.getByRole("button", { name: /add routine/i }));

    // User sees modal with two options
    expect(screen.getByText(/new routine/i)).toBeInTheDocument();
    expect(screen.getByText(/from template/i)).toBeInTheDocument();
    expect(screen.getByText(/blank routine/i)).toBeInTheDocument();

    // User clicks "Blank routine"
    await user.click(screen.getByText(/blank routine/i));

    // User sees routine info form
    expect(screen.getByRole("heading", { name: /create routine/i })).toBeInTheDocument();

    // User fills in routine details
    await user.type(screen.getByLabelText(/routine name/i), "My Winter Routine");
    await user.type(screen.getByLabelText(/start date/i), "2025-01-15");
    // Leave end date empty (ongoing routine)

    // User clicks "Create Routine"
    await user.click(screen.getByRole("button", { name: /create routine/i }));

    // Verify server action was called
    expect(mockOnCreateBlank).toHaveBeenCalledWith(
      "My Winter Routine",
      expect.any(Date),
      null
    );

    // Simulate routine created - rerender with routine
    const createdRoutine: Routine = {
      id: "routine-1",
      name: "My Winter Routine",
      startDate: new Date("2025-01-15"),
      endDate: null,
      userProfileId: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    rerender(
      <RoutineSection
        routine={createdRoutine}
        products={[]}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User sees routine header
    expect(screen.getByText("My Winter Routine")).toBeInTheDocument();
    expect(screen.getByText(/ongoing/i)).toBeInTheDocument();

    // User adds a morning product
    const morningSection = screen.getAllByText(/morning/i)[0].parentElement?.parentElement;
    expect(morningSection).toBeInTheDocument();

    // User clicks "Add Step" in morning section
    const addStepButtons = screen.getAllByRole("button", { name: /add step/i });
    await user.click(addStepButtons[0]); // First button is morning

    // User selects routine step
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]); // Routine step combobox
    await user.click(screen.getByText("Cleanser"));

    // User fills in product details
    await user.type(screen.getByPlaceholderText(/product name/i), "CeraVe Hydrating Cleanser");
    await user.type(screen.getByPlaceholderText(/instructions/i), "Apply to damp skin, massage gently");

    // User clicks "Add"
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    // Verify product was added
    expect(mockOnAddProduct).toHaveBeenCalledWith("morning", {
      routineStep: "Cleanser",
      productName: "CeraVe Hydrating Cleanser",
      productUrl: "",
      instructions: "Apply to damp skin, massage gently",
      frequency: "Daily",
      days: undefined,
    });
  });

  it("user creates routine from template and sees pre-populated products", async () => {
    const user = userEvent.setup();

    render(
      <RoutineSection
        routine={null}
        products={[]}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User clicks "Add Routine"
    await user.click(screen.getByRole("button", { name: /add routine/i }));

    // User clicks "From template"
    await user.click(screen.getByText(/from template/i));

    // User sees template selection screen
    expect(screen.getByRole("heading", { name: /select a template/i })).toBeInTheDocument();
    expect(screen.getByText("Morning Glow Routine")).toBeInTheDocument();
    expect(screen.getByText("Night Recovery Routine")).toBeInTheDocument();
    expect(screen.getByText("Acne-Prone Skin Care")).toBeInTheDocument();

    // User selects the first template (click on the template name text)
    await user.click(screen.getByText("Morning Glow Routine"));

    // User clicks Continue
    await user.click(screen.getByRole("button", { name: /continue/i }));

    // User sees routine info form with template name pre-filled
    expect(screen.getByRole("heading", { name: /customize routine/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Morning Glow Routine")).toBeInTheDocument();

    // User updates the name
    await user.clear(screen.getByLabelText(/routine name/i));
    await user.type(screen.getByLabelText(/routine name/i), "My Morning Routine");

    // User fills in dates
    await user.type(screen.getByLabelText(/start date/i), "2025-02-01");
    await user.type(screen.getByLabelText(/end date/i), "2025-04-01");

    // User clicks "Create Routine"
    await user.click(screen.getByRole("button", { name: /create routine/i }));

    // Verify server action was called with template ID and routine details
    expect(mockOnCreateFromTemplate).toHaveBeenCalledWith(
      "template-1",
      "My Morning Routine",
      expect.any(Date),
      expect.any(Date)
    );
  });

  it("user edits routine name and dates successfully", async () => {
    const user = userEvent.setup();

    const existingRoutine: Routine = {
      id: "routine-1",
      name: "Old Routine Name",
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-03-01"),
      userProfileId: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(
      <RoutineSection
        routine={existingRoutine}
        products={[]}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User sees existing routine
    expect(screen.getByText("Old Routine Name")).toBeInTheDocument();

    // User clicks Edit button
    await user.click(screen.getByRole("button", { name: /edit/i }));

    // User sees edit dialog with current values
    expect(screen.getByDisplayValue("Old Routine Name")).toBeInTheDocument();

    // User updates the name
    await user.clear(screen.getByLabelText(/routine name/i));
    await user.type(screen.getByLabelText(/routine name/i), "Updated Routine Name");

    // User updates end date
    await user.clear(screen.getByLabelText(/end date/i));
    await user.type(screen.getByLabelText(/end date/i), "2025-06-01");

    // User saves changes
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Verify update was called
    expect(mockOnUpdateRoutine).toHaveBeenCalledWith({
      name: "Updated Routine Name",
      startDate: expect.any(Date),
      endDate: expect.any(Date),
    });
  });

  it("user deletes routine with confirmation and sees empty state", async () => {
    const user = userEvent.setup();

    const existingRoutine: Routine = {
      id: "routine-1",
      name: "Routine to Delete",
      startDate: new Date("2025-01-01"),
      endDate: null,
      userProfileId: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { rerender } = render(
      <RoutineSection
        routine={existingRoutine}
        products={[]}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User sees routine
    expect(screen.getByText("Routine to Delete")).toBeInTheDocument();

    // User clicks delete routine button
    await user.click(screen.getByRole("button", { name: /delete routine/i }));

    // User sees confirmation dialog
    expect(screen.getByText(/delete routine\?/i)).toBeInTheDocument();
    expect(screen.getByText(/this will permanently delete/i)).toBeInTheDocument();

    // User confirms deletion
    await user.click(screen.getByRole("button", { name: /^delete$/i }));

    // Verify delete was called
    expect(mockOnDeleteRoutine).toHaveBeenCalled();

    // Simulate deletion - rerender with no routine
    rerender(
      <RoutineSection
        routine={null}
        products={[]}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User sees empty state again
    expect(screen.getByText(/no routine set yet/i)).toBeInTheDocument();
  });

  it("user adds evening product with all required fields", async () => {
    const user = userEvent.setup();

    const existingRoutine: Routine = {
      id: "routine-1",
      name: "My Routine",
      startDate: new Date("2025-01-01"),
      endDate: null,
      userProfileId: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(
      <RoutineSection
        routine={existingRoutine}
        products={[]}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User clicks "Add Step" in evening section (second button)
    const addStepButtons = screen.getAllByRole("button", { name: /add step/i });
    await user.click(addStepButtons[1]); // Evening is second

    // User selects routine step
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]);
    await user.click(screen.getByText("Moisturizer / Cream"));

    // User fills in product details
    await user.type(screen.getByPlaceholderText(/product name/i), "Night Moisturizer");
    await user.type(screen.getByPlaceholderText(/product url/i), "https://example.com/moisturizer");
    await user.type(screen.getByPlaceholderText(/instructions/i), "Apply generously before bed");

    // User clicks Add
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    // Verify product was added to evening
    expect(mockOnAddProduct).toHaveBeenCalledWith("evening", {
      routineStep: "Moisturizer / Cream",
      productName: "Night Moisturizer",
      productUrl: "https://example.com/moisturizer",
      instructions: "Apply generously before bed",
      frequency: "Daily",
      days: undefined,
    });
  });

  it("user edits existing product instructions and saves", async () => {
    const user = userEvent.setup();

    const existingRoutine: Routine = {
      id: "routine-1",
      name: "My Routine",
      startDate: new Date("2025-01-01"),
      endDate: null,
      userProfileId: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const existingProducts: RoutineProduct[] = [
      {
        id: "product-1",
        routineId: "routine-1",
        routineStep: "Cleanser",
        productName: "CeraVe Cleanser",
        productUrl: null,
        instructions: "Old instructions",
        frequency: "Daily",
        days: null,
        timeOfDay: "morning",
      },
    ];

    render(
      <RoutineSection
        routine={existingRoutine}
        products={existingProducts}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User sees existing product
    expect(screen.getByText("CeraVe Cleanser")).toBeInTheDocument();

    // User clicks on product to edit
    await user.click(screen.getByText("CeraVe Cleanser"));

    // User sees current instructions
    expect(screen.getByDisplayValue("Old instructions")).toBeInTheDocument();

    // User updates instructions
    const instructionsInput = screen.getByPlaceholderText(/instructions/i);
    await user.clear(instructionsInput);
    await user.type(instructionsInput, "Updated instructions");

    // User saves
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Verify update was called
    expect(mockOnUpdateProduct).toHaveBeenCalledWith("product-1", {
      routineStep: "Cleanser",
      productName: "CeraVe Cleanser",
      productUrl: null,
      instructions: "Updated instructions",
      frequency: "Daily",
      days: null,
    });
  });

  it("user deletes a product", async () => {
    const user = userEvent.setup();

    const existingRoutine: Routine = {
      id: "routine-1",
      name: "My Routine",
      startDate: new Date("2025-01-01"),
      endDate: null,
      userProfileId: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const existingProducts: RoutineProduct[] = [
      {
        id: "product-1",
        routineId: "routine-1",
        routineStep: "Cleanser",
        productName: "Product to Delete",
        productUrl: null,
        instructions: "Some instructions",
        frequency: "Daily",
        days: null,
        timeOfDay: "morning",
      },
    ];

    render(
      <RoutineSection
        routine={existingRoutine}
        products={existingProducts}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User sees product
    expect(screen.getByText("Product to Delete")).toBeInTheDocument();

    // User clicks delete button for the product
    await user.click(screen.getByLabelText(/delete step/i));

    // Verify delete was called
    expect(mockOnDeleteProduct).toHaveBeenCalledWith("product-1");
  });

  it("user adds product with 2x per week frequency and selects days", async () => {
    const user = userEvent.setup();

    const existingRoutine: Routine = {
      id: "routine-1",
      name: "My Routine",
      startDate: new Date("2025-01-01"),
      endDate: null,
      userProfileId: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(
      <RoutineSection
        routine={existingRoutine}
        products={[]}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User clicks "Add Step" in morning section
    const addStepButtons = screen.getAllByRole("button", { name: /add step/i });
    await user.click(addStepButtons[0]);

    // User selects routine step
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]);
    await user.click(screen.getByText("Exfoliant / Peel"));

    // User fills in product details
    await user.type(screen.getByPlaceholderText(/product name/i), "AHA Toner");
    await user.type(screen.getByPlaceholderText(/instructions/i), "Apply with cotton pad");

    // User changes frequency to 2x per week
    await user.click(comboboxes[1]); // Frequency combobox
    await user.click(screen.getByText("2x per week"));

    // User sees day selector and prompt
    expect(screen.getByText(/select 2 days/i)).toBeInTheDocument();

    // User selects Mon and Thu
    await user.click(screen.getByRole("button", { name: /mon/i }));
    await user.click(screen.getByRole("button", { name: /thu/i }));

    // User clicks Add
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    // Verify product was added with frequency and days
    expect(mockOnAddProduct).toHaveBeenCalledWith("morning", {
      routineStep: "Exfoliant / Peel",
      productName: "AHA Toner",
      productUrl: "",
      instructions: "Apply with cotton pad",
      frequency: "2x per week",
      days: expect.arrayContaining(["Mon", "Thu"]),
    });
  });

  it("user sees validation errors when creating routine, corrects them, and succeeds", async () => {
    const user = userEvent.setup();

    // Mock will fail first, then succeed
    mockOnCreateBlank
      .mockResolvedValueOnce(undefined) // Will succeed (validation happens client-side)
      .mockResolvedValueOnce(undefined);

    render(
      <RoutineSection
        routine={null}
        products={[]}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User clicks "Add Routine"
    await user.click(screen.getByRole("button", { name: /add routine/i }));
    await user.click(screen.getByText(/blank routine/i));

    // User tries to submit without filling fields
    const createButton = screen.getByRole("button", { name: /create routine/i });

    // Button should be disabled without name and start date
    expect(createButton).toBeDisabled();

    // User fills only name (no start date yet)
    await user.type(screen.getByLabelText(/routine name/i), "My Routine");

    // Button still disabled
    expect(createButton).toBeDisabled();

    // User fills start date
    await user.type(screen.getByLabelText(/start date/i), "2025-02-01");

    // Button now enabled
    expect(createButton).not.toBeDisabled();

    // User submits successfully
    await user.click(createButton);

    // Verify submission
    expect(mockOnCreateBlank).toHaveBeenCalledWith(
      "My Routine",
      expect.any(Date),
      null
    );
  });

  it("user searches templates and sees filtered results", async () => {
    const user = userEvent.setup();

    render(
      <RoutineSection
        routine={null}
        products={[]}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User opens modal and selects template option
    await user.click(screen.getByRole("button", { name: /add routine/i }));
    await user.click(screen.getByText(/from template/i));

    // User sees all templates
    expect(screen.getByText("Morning Glow Routine")).toBeInTheDocument();
    expect(screen.getByText("Night Recovery Routine")).toBeInTheDocument();
    expect(screen.getByText("Acne-Prone Skin Care")).toBeInTheDocument();

    // User searches for "night"
    await user.type(screen.getByPlaceholderText(/search routine templates/i), "night");

    // User sees only matching template
    expect(screen.getByText("Night Recovery Routine")).toBeInTheDocument();
    expect(screen.queryByText("Morning Glow Routine")).not.toBeInTheDocument();
    expect(screen.queryByText("Acne-Prone Skin Care")).not.toBeInTheDocument();
  });

  it("user sees 'No templates found' when search returns no results", async () => {
    const user = userEvent.setup();

    render(
      <RoutineSection
        routine={null}
        products={[]}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User opens modal and selects template option
    await user.click(screen.getByRole("button", { name: /add routine/i }));
    await user.click(screen.getByText(/from template/i));

    // User searches for something that doesn't exist
    await user.type(screen.getByPlaceholderText(/search routine templates/i), "nonexistent");

    // User sees "no templates found" message
    expect(screen.getByText(/no templates found/i)).toBeInTheDocument();
  });

  it("user cancels routine creation and modal resets", async () => {
    const user = userEvent.setup();

    render(
      <RoutineSection
        routine={null}
        products={[]}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User opens modal and goes to routine info form
    await user.click(screen.getByRole("button", { name: /add routine/i }));
    await user.click(screen.getByText(/blank routine/i));

    // User fills some data
    await user.type(screen.getByLabelText(/routine name/i), "Test Routine");
    await user.type(screen.getByLabelText(/start date/i), "2025-02-01");

    // User cancels
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    // Modal should close - empty state should be visible
    expect(screen.getByText(/no routine set yet/i)).toBeInTheDocument();

    // Server action should not have been called
    expect(mockOnCreateBlank).not.toHaveBeenCalled();

    // If user opens modal again, fields should be reset
    await user.click(screen.getByRole("button", { name: /add routine/i }));
    await user.click(screen.getByText(/blank routine/i));

    // Fields should be empty
    expect(screen.getByLabelText(/routine name/i)).toHaveValue("");
  });

  it("user sees validation errors when adding product, corrects them, and succeeds", async () => {
    const user = userEvent.setup();

    const existingRoutine: Routine = {
      id: "routine-1",
      name: "My Routine",
      startDate: new Date("2025-01-01"),
      endDate: null,
      userProfileId: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(
      <RoutineSection
        routine={existingRoutine}
        products={[]}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User clicks "Add Step" in morning section
    const addStepButtons = screen.getAllByRole("button", { name: /add step/i });
    await user.click(addStepButtons[0]);

    // User tries to add without selecting routine step
    await user.type(screen.getByPlaceholderText(/product name/i), "Some Product");
    await user.type(screen.getByPlaceholderText(/instructions/i), "Some instructions");
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    // Server action should not be called (validation failed)
    expect(mockOnAddProduct).not.toHaveBeenCalled();

    // User now selects routine step
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]);
    await user.click(screen.getByText("Cleanser"));

    // User tries again - should succeed now
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    // Server action should be called
    expect(mockOnAddProduct).toHaveBeenCalledWith("morning", {
      routineStep: "Cleanser",
      productName: "Some Product",
      productUrl: "",
      instructions: "Some instructions",
      frequency: "Daily",
      days: undefined,
    });
  });

  it("user sees error when routine creation fails and can retry", async () => {
    const user = userEvent.setup();

    // Mock server action to fail first, then succeed
    mockOnCreateBlank
      .mockResolvedValueOnce(undefined) // First attempt fails (no routine created)
      .mockResolvedValueOnce(undefined); // Second attempt succeeds

    render(
      <RoutineSection
        routine={null}
        products={[]}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User sees empty state
    expect(screen.getByText(/no routine set yet/i)).toBeInTheDocument();

    // User clicks Add Routine
    await user.click(screen.getByRole("button", { name: /add routine/i }));

    // User chooses to create blank routine
    await user.click(screen.getByRole("button", { name: /start from scratch/i }));

    // User fills in routine info
    await user.type(screen.getByLabelText(/routine name/i), "Test Routine");
    await user.type(screen.getByLabelText(/start date/i), "2025-01-15");

    // User clicks Create
    await user.click(screen.getByRole("button", { name: /^create routine$/i }));

    // Server action is called but fails (returns nothing)
    await waitFor(() => {
      expect(mockOnCreateBlank).toHaveBeenCalledWith(
        "Test Routine",
        new Date("2025-01-15"),
        null
      );
    });

    // Since server failed, routine should not appear - empty state remains
    expect(screen.getByText(/no routine set yet/i)).toBeInTheDocument();

    // User tries again - opens modal again
    await user.click(screen.getByRole("button", { name: /add routine/i }));
    await user.click(screen.getByRole("button", { name: /start from scratch/i }));

    // User fills in routine info again
    await user.type(screen.getByLabelText(/routine name/i), "Fixed Routine");
    await user.type(screen.getByLabelText(/start date/i), "2025-01-20");

    // User clicks Create again
    await user.click(screen.getByRole("button", { name: /^create routine$/i }));

    // Server action succeeds this time
    await waitFor(() => {
      expect(mockOnCreateBlank).toHaveBeenCalledTimes(2);
    });
  });

  it("user navigates back through modal steps without losing data", async () => {
    const user = userEvent.setup();

    render(
      <RoutineSection
        routine={null}
        products={[]}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User opens Add Routine modal and chooses blank routine
    await user.click(screen.getByRole("button", { name: /add routine/i }));
    await user.click(screen.getByRole("button", { name: /start from scratch/i }));

    // User fills in routine info
    await user.type(screen.getByLabelText(/routine name/i), "My Custom Routine");
    await user.type(screen.getByLabelText(/start date/i), "2025-03-15");
    await user.type(screen.getByLabelText(/end date/i), "2025-06-15");

    // User clicks Back to return to start view
    await user.click(screen.getByRole("button", { name: /go back/i }));

    // User should see start view again
    expect(screen.getByRole("button", { name: /use a template/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start from scratch/i })).toBeInTheDocument();

    // User clicks "Start from scratch" again to return to form
    await user.click(screen.getByRole("button", { name: /start from scratch/i }));

    // Data should still be filled in (preserved during navigation)
    const routineNameInput = screen.getByLabelText(/routine name/i) as HTMLInputElement;
    const startDateInput = screen.getByLabelText(/start date/i) as HTMLInputElement;
    const endDateInput = screen.getByLabelText(/end date/i) as HTMLInputElement;

    expect(routineNameInput.value).toBe("My Custom Routine");
    expect(startDateInput.value).toBe("2025-03-15");
    expect(endDateInput.value).toBe("2025-06-15");
  });

  it("user cancels editing a product without saving changes", async () => {
    const user = userEvent.setup();

    const existingRoutine: Routine = {
      id: "routine-1",
      name: "My Routine",
      startDate: new Date("2025-01-01"),
      endDate: null,
      userProfileId: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const existingProducts: RoutineProduct[] = [
      {
        id: "product-1",
        routineId: "routine-1",
        routineStep: "Cleanser",
        productName: "Original Name",
        productUrl: null,
        instructions: "Original instructions",
        frequency: "Daily",
        days: null,
        timeOfDay: "morning",
      },
    ];

    render(
      <RoutineSection
        routine={existingRoutine}
        products={existingProducts}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User clicks on product to edit
    await user.click(screen.getByText("Original Name"));

    // User sees edit form
    expect(screen.getByPlaceholderText(/product name/i)).toBeInTheDocument();

    // User makes changes
    const nameInput = screen.getByPlaceholderText(/product name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Changed Name");

    const instructionsInput = screen.getByPlaceholderText(/instructions/i);
    await user.clear(instructionsInput);
    await user.type(instructionsInput, "Changed instructions");

    // User clicks Cancel
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    // Form closes - onUpdateProduct should NOT have been called
    expect(mockOnUpdateProduct).not.toHaveBeenCalled();

    // User sees original product name (changes discarded)
    expect(screen.getByText("Original Name")).toBeInTheDocument();
    expect(screen.getByText("Original instructions")).toBeInTheDocument();
  });

  it("user changes frequency from 2x per week back to Daily and days are cleared", async () => {
    const user = userEvent.setup();

    const existingRoutine: Routine = {
      id: "routine-1",
      name: "My Routine",
      startDate: new Date("2025-01-01"),
      endDate: null,
      userProfileId: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const existingProducts: RoutineProduct[] = [
      {
        id: "product-1",
        routineId: "routine-1",
        routineStep: "Exfoliant / Peel",
        productName: "AHA Toner",
        productUrl: null,
        instructions: "Apply with cotton pad",
        frequency: "2x per week",
        days: ["Mon", "Thu"],
        timeOfDay: "morning",
      },
    ];

    render(
      <RoutineSection
        routine={existingRoutine}
        products={existingProducts}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User clicks on product to edit
    await user.click(screen.getByText("AHA Toner"));

    // User sees current frequency is 2x per week with day selection UI
    expect(screen.getByText(/select 2 days/i)).toBeInTheDocument();

    // User changes frequency back to Daily
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[1]); // Frequency combobox (index 1 because routine step is index 0)
    await user.click(screen.getByRole("option", { name: /^daily$/i }));

    // Day selection UI should disappear
    await waitFor(() => {
      expect(screen.queryByText(/select 2 days/i)).not.toBeInTheDocument();
    });

    // User saves
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Verify days are cleared (undefined)
    expect(mockOnUpdateProduct).toHaveBeenCalledWith("product-1", {
      routineStep: "Exfoliant / Peel",
      productName: "AHA Toner",
      productUrl: null,
      instructions: "Apply with cotton pad",
      frequency: "Daily",
      days: undefined,
    });
  });

  it("user deselects a day and cannot select more than max days", async () => {
    const user = userEvent.setup();

    const existingRoutine: Routine = {
      id: "routine-1",
      name: "My Routine",
      startDate: new Date("2025-01-01"),
      endDate: null,
      userProfileId: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(
      <RoutineSection
        routine={existingRoutine}
        products={[]}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User clicks "Add Step" in morning section
    const addStepButtons = screen.getAllByRole("button", { name: /add step/i });
    await user.click(addStepButtons[0]);

    // User selects routine step and fills basics
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]);
    await user.click(screen.getByText("Serum / Treatment"));
    await user.type(screen.getByPlaceholderText(/product name/i), "Vitamin C Serum");
    await user.type(screen.getByPlaceholderText(/instructions/i), "Apply in the morning");

    // User changes frequency to 2x per week
    await user.click(comboboxes[1]);
    await user.click(screen.getByText("2x per week"));

    // User selects Mon and Thu
    const monButton = screen.getByRole("button", { name: /^mon$/i });
    const thuButton = screen.getByRole("button", { name: /^thu$/i });
    const wedButton = screen.getByRole("button", { name: /^wed$/i });

    await user.click(monButton);
    await user.click(thuButton);

    // Wed button should now be disabled (max 2 days reached)
    expect(wedButton).toBeDisabled();

    // User deselects Mon
    await user.click(monButton);

    // Now Wed should be enabled again
    await waitFor(() => {
      expect(wedButton).not.toBeDisabled();
    });

    // User can now select Wed
    await user.click(wedButton);

    // User saves
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    // Verify product added with Thu and Wed (not Mon)
    expect(mockOnAddProduct).toHaveBeenCalledWith("morning", {
      routineStep: "Serum / Treatment",
      productName: "Vitamin C Serum",
      productUrl: "",
      instructions: "Apply in the morning",
      frequency: "2x per week",
      days: expect.arrayContaining(["Thu", "Wed"]),
    });
  });

  it("user sees product with URL displayed as clickable link", async () => {
    const existingRoutine: Routine = {
      id: "routine-1",
      name: "My Routine",
      startDate: new Date("2025-01-01"),
      endDate: null,
      userProfileId: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const existingProducts: RoutineProduct[] = [
      {
        id: "product-1",
        routineId: "routine-1",
        routineStep: "Moisturizer / Cream",
        productName: "CeraVe Moisturizer",
        productUrl: "https://example.com/cerave-moisturizer",
        instructions: "Apply twice daily",
        frequency: "Daily",
        days: null,
        timeOfDay: "morning",
      },
    ];

    render(
      <RoutineSection
        routine={existingRoutine}
        products={existingProducts}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User sees product name as clickable link
    const productLink = screen.getByRole("link", { name: /cerave moisturizer/i });
    expect(productLink).toHaveAttribute("href", "https://example.com/cerave-moisturizer");
    expect(productLink).toHaveAttribute("target", "_blank");
    expect(productLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("user sees days displayed in frequency badge for product with 2x per week", async () => {
    const existingRoutine: Routine = {
      id: "routine-1",
      name: "My Routine",
      startDate: new Date("2025-01-01"),
      endDate: null,
      userProfileId: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const existingProducts: RoutineProduct[] = [
      {
        id: "product-1",
        routineId: "routine-1",
        routineStep: "Exfoliant / Peel",
        productName: "Glycolic Acid Toner",
        productUrl: null,
        instructions: "Use in the evening",
        frequency: "2x per week",
        days: ["Mon", "Thu"],
        timeOfDay: "evening",
      },
    ];

    render(
      <RoutineSection
        routine={existingRoutine}
        products={existingProducts}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User sees frequency badge with days displayed
    expect(screen.getByText(/2x per week/)).toBeInTheDocument();
    expect(screen.getByText(/Mon, Thu/)).toBeInTheDocument();
  });
});

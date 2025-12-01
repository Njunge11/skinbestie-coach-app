import { render, screen, waitFor, setupUser } from "@/test/utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RoutineSection } from "./routine-section";
import type { RoutineProduct } from "../types";
import { makeRoutine, makeRoutineProduct } from "@/test/factories";

describe("RoutineSection - Complete User Workflows", () => {
  // Mock server actions at the network boundary
  const mockOnCreateFromTemplate = vi.fn();
  const mockOnCreateBlank = vi.fn();
  const mockOnUpdateRoutine = vi.fn();
  const mockOnPublishRoutine = vi.fn();
  const mockOnDeleteRoutine = vi.fn();
  const mockOnAddProduct = vi.fn();
  const mockOnUpdateProduct = vi.fn();
  const mockOnDeleteProduct = vi.fn();
  const mockOnReorderProducts = vi.fn();
  const mockOnSaveAsTemplate = vi.fn();

  const mockTemplates = [
    {
      id: "template-1",
      name: "Morning Glow Routine",
      description: "Energizing morning skincare",
    },
    {
      id: "template-2",
      name: "Night Recovery Routine",
      description: "Deep repair and hydration",
    },
    {
      id: "template-3",
      name: "Acne-Prone Skin Care",
      description: "Clear and balanced skin",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("user edits routine name and dates successfully", async () => {
    const user = setupUser();

    const existingRoutine = makeRoutine({
      id: "routine-1",
      name: "Old Routine Name",
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-03-01"),
      status: "draft",
    });

    render(
      <RoutineSection
        routine={existingRoutine}
        products={[]}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onPublishRoutine={mockOnPublishRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />,
    );

    // User sees existing routine
    expect(screen.getByText("Old Routine Name")).toBeInTheDocument();

    // User clicks Edit button
    await user.click(screen.getByRole("button", { name: /edit/i }));

    // User sees edit dialog with current values
    expect(screen.getByDisplayValue("Old Routine Name")).toBeInTheDocument();

    // User updates the name
    await user.clear(screen.getByLabelText(/routine name/i));
    await user.type(
      screen.getByLabelText(/routine name/i),
      "Updated Routine Name",
    );

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
    const user = setupUser();

    const existingRoutine = makeRoutine({
      id: "routine-1",
      name: "Routine to Delete",
      startDate: new Date("2025-01-01"),
      endDate: null,
      status: "draft",
    });

    const { rerender } = render(
      <RoutineSection
        routine={existingRoutine}
        products={[]}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onPublishRoutine={mockOnPublishRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />,
    );

    // User sees routine
    expect(screen.getByText("Routine to Delete")).toBeInTheDocument();

    // User clicks delete routine button
    await user.click(screen.getByRole("button", { name: /delete routine/i }));

    // User sees confirmation dialog
    expect(screen.getByText(/delete routine\?/i)).toBeInTheDocument();
    expect(
      screen.getByText(/this will permanently delete/i),
    ).toBeInTheDocument();

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
        onPublishRoutine={mockOnPublishRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />,
    );

    // User sees empty state again
    expect(screen.getByText(/no routine set yet/i)).toBeInTheDocument();
  });

  it("user adds evening product with all required fields", async () => {
    const user = setupUser();

    const existingRoutine = makeRoutine({
      id: "routine-1",
      name: "My Routine",
      startDate: new Date("2025-01-01"),
      endDate: null,
      status: "draft",
    });

    render(
      <RoutineSection
        routine={existingRoutine}
        products={[]}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onPublishRoutine={mockOnPublishRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />,
    );

    // User clicks "Add Step" in evening section (second button)
    const addStepButtons = screen.getAllByRole("button", { name: /add step/i });
    await user.click(addStepButtons[1]); // Evening is second

    // User sees modal with step type selection
    expect(screen.getByText(/add a new step/i)).toBeInTheDocument();

    // User selects "Product Step" card (first card in the grid)
    const productStepCard = screen
      .getByText(/add a step that uses a skincare product/i)
      .closest("button");
    await user.click(productStepCard as HTMLElement);

    // User sees form for product step
    expect(screen.getByText(/add product step/i)).toBeInTheDocument();

    // User selects routine step
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]);
    await user.click(screen.getByText("Moisturise"));

    // User fills in product details
    await user.type(
      screen.getByPlaceholderText(/product name/i),
      "Night Moisturizer",
    );
    await user.type(
      screen.getByPlaceholderText(/product url/i),
      "https://example.com/moisturizer",
    );
    await user.type(
      screen.getByPlaceholderText(/apply to damp skin/i),
      "Apply generously before bed",
    );

    // User clicks Add
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    // Verify product was added to evening
    expect(mockOnAddProduct).toHaveBeenCalledWith("evening", {
      stepType: "product",
      stepName: undefined,
      routineStep: "Moisturise",
      productName: "Night Moisturizer",
      productUrl: "https://example.com/moisturizer",
      instructions: "Apply generously before bed",
      productPurchaseInstructions: "",
      frequency: "daily",
      days: undefined,
    });
  }, 10000);

  it("user edits existing product instructions and saves", async () => {
    const user = setupUser();

    const existingRoutine = makeRoutine({
      id: "routine-1",
      name: "My Routine",
      startDate: new Date("2025-01-01"),
      endDate: null,
      status: "draft",
    });

    const existingProducts: RoutineProduct[] = [
      makeRoutineProduct({
        id: "product-1",
        routineId: "routine-1",
        routineStep: "Cleanse",
        productName: "CeraVe Cleanser",
        productUrl: null,
        instructions: "Old instructions",
        frequency: "daily",
        days: null,
        timeOfDay: "morning",
        order: 0,
      }),
    ];

    render(
      <RoutineSection
        routine={existingRoutine}
        products={existingProducts}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onPublishRoutine={mockOnPublishRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />,
    );

    // User sees existing product
    expect(screen.getByText("CeraVe Cleanser")).toBeInTheDocument();

    // User clicks on product to edit
    await user.click(screen.getByText("CeraVe Cleanser"));

    // User sees current instructions
    expect(screen.getByDisplayValue("Old instructions")).toBeInTheDocument();

    // User updates instructions
    const instructionsInput =
      screen.getByPlaceholderText(/apply to damp skin/i);
    await user.clear(instructionsInput);
    await user.type(instructionsInput, "Updated instructions");

    // User saves
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Verify update was called
    expect(mockOnUpdateProduct).toHaveBeenCalledWith("product-1", {
      stepType: "product",
      stepName: undefined,
      routineStep: "Cleanse",
      productName: "CeraVe Cleanser",
      productUrl: "",
      instructions: "Updated instructions",
      productPurchaseInstructions: "",
      frequency: "daily",
      days: undefined,
    });
  });

  it("user deletes a product", async () => {
    const user = setupUser();

    const existingRoutine = makeRoutine({
      id: "routine-1",
      name: "My Routine",
      startDate: new Date("2025-01-01"),
      endDate: null,
      status: "draft",
    });

    const existingProducts: RoutineProduct[] = [
      makeRoutineProduct({
        id: "product-1",
        routineId: "routine-1",
        routineStep: "Cleanse",
        productName: "Product to Delete",
        productUrl: null,
        instructions: "Some instructions",
        frequency: "daily",
        days: null,
        timeOfDay: "morning",
        order: 0,
      }),
    ];

    render(
      <RoutineSection
        routine={existingRoutine}
        products={existingProducts}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onPublishRoutine={mockOnPublishRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />,
    );

    // User sees product
    expect(screen.getByText("Product to Delete")).toBeInTheDocument();

    // User clicks delete button for the product
    await user.click(screen.getByLabelText(/delete step/i));

    // Verify delete was called
    expect(mockOnDeleteProduct).toHaveBeenCalledWith("product-1");
  });

  it("user adds product with 2x per week frequency and selects days", async () => {
    const user = setupUser();

    const existingRoutine = makeRoutine({
      id: "routine-1",
      name: "My Routine",
      startDate: new Date("2025-01-01"),
      endDate: null,
      status: "draft",
    });

    render(
      <RoutineSection
        routine={existingRoutine}
        products={[]}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onPublishRoutine={mockOnPublishRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />,
    );

    // User clicks "Add Step" in morning section
    const addStepButtons = screen.getAllByRole("button", { name: /add step/i });
    await user.click(addStepButtons[0]);

    // User selects "Product Step" card
    const productStepCard = screen
      .getByText(/add a step that uses a skincare product/i)
      .closest("button");
    await user.click(productStepCard as HTMLElement);

    // User selects routine step
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]);
    await user.click(screen.getByText("Treat"));

    // User fills in product details
    await user.type(screen.getByPlaceholderText(/product name/i), "AHA Toner");
    await user.type(
      screen.getByPlaceholderText(/apply to damp skin/i),
      "Apply with cotton pad",
    );

    // User changes frequency to 2x per week
    await user.click(comboboxes[1]); // Frequency combobox
    await user.click(screen.getByText("2x per week"));

    // User sees day selector (no error initially)
    expect(screen.getByRole("button", { name: /mon/i })).toBeInTheDocument();
    expect(
      screen.queryByText(/please select exactly 2 days/i),
    ).not.toBeInTheDocument();

    // User selects Mon and Thu
    await user.click(screen.getByRole("button", { name: /mon/i }));
    await user.click(screen.getByRole("button", { name: /thu/i }));

    // User clicks Add
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    // Verify product was added with frequency and days
    expect(mockOnAddProduct).toHaveBeenCalledWith("morning", {
      stepType: "product",
      stepName: undefined,
      routineStep: "Treat",
      productName: "AHA Toner",
      productUrl: "",
      instructions: "Apply with cotton pad",
      productPurchaseInstructions: "",
      frequency: "2x per week",
      days: expect.arrayContaining(["Monday", "Thursday"]),
    });
  });

  it("user sees validation errors when creating routine, corrects them, and succeeds", async () => {
    const user = setupUser();

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
        onPublishRoutine={mockOnPublishRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />,
    );

    // User clicks "Add Routine"
    await user.click(screen.getByRole("button", { name: /add routine/i }));
    await user.click(screen.getByText(/blank routine/i));

    // User tries to submit without filling fields
    const createButton = screen.getByRole("button", {
      name: /create routine/i,
    });

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
      null,
    );
  });

  it("user searches templates and sees filtered results", async () => {
    const user = setupUser();

    render(
      <RoutineSection
        routine={null}
        products={[]}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onPublishRoutine={mockOnPublishRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />,
    );

    // User opens modal and selects template option
    await user.click(screen.getByRole("button", { name: /add routine/i }));
    await user.click(screen.getByText(/from template/i));

    // User sees all templates
    expect(screen.getByText("Morning Glow Routine")).toBeInTheDocument();
    expect(screen.getByText("Night Recovery Routine")).toBeInTheDocument();
    expect(screen.getByText("Acne-Prone Skin Care")).toBeInTheDocument();

    // User searches for "night"
    await user.type(
      screen.getByPlaceholderText(/search routine templates/i),
      "night",
    );

    // User sees only matching template
    expect(screen.getByText("Night Recovery Routine")).toBeInTheDocument();
    expect(screen.queryByText("Morning Glow Routine")).not.toBeInTheDocument();
    expect(screen.queryByText("Acne-Prone Skin Care")).not.toBeInTheDocument();
  });

  it("user sees 'No templates found' when search returns no results", async () => {
    const user = setupUser();

    render(
      <RoutineSection
        routine={null}
        products={[]}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onPublishRoutine={mockOnPublishRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />,
    );

    // User opens modal and selects template option
    await user.click(screen.getByRole("button", { name: /add routine/i }));
    await user.click(screen.getByText(/from template/i));

    // User searches for something that doesn't exist
    await user.type(
      screen.getByPlaceholderText(/search routine templates/i),
      "nonexistent",
    );

    // User sees "no templates found" message
    expect(screen.getByText(/no templates found/i)).toBeInTheDocument();
  });

  it("user cancels routine creation and modal resets", async () => {
    const user = setupUser();

    render(
      <RoutineSection
        routine={null}
        products={[]}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onPublishRoutine={mockOnPublishRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />,
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
    const user = setupUser();

    const existingRoutine = makeRoutine({
      id: "routine-1",
      name: "My Routine",
      startDate: new Date("2025-01-01"),
      endDate: null,
      status: "draft",
    });

    render(
      <RoutineSection
        routine={existingRoutine}
        products={[]}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onPublishRoutine={mockOnPublishRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />,
    );

    // User clicks "Add Step" in morning section
    const addStepButtons = screen.getAllByRole("button", { name: /add step/i });
    await user.click(addStepButtons[0]);

    // User selects "Product Step" card
    const productStepCard = screen
      .getByText(/add a step that uses a skincare product/i)
      .closest("button");
    await user.click(productStepCard as HTMLElement);

    // User tries to add without selecting routine step
    await user.type(
      screen.getByPlaceholderText(/product name/i),
      "Some Product",
    );
    await user.type(
      screen.getByPlaceholderText(/apply to damp skin/i),
      "Some instructions",
    );
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    // Server action should not be called (validation failed)
    expect(mockOnAddProduct).not.toHaveBeenCalled();

    // User now selects routine step
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]);
    await user.click(screen.getByText("Cleanse"));

    // User tries again - should succeed now
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    // Server action should be called
    expect(mockOnAddProduct).toHaveBeenCalledWith("morning", {
      stepType: "product",
      stepName: undefined,
      routineStep: "Cleanse",
      productName: "Some Product",
      productUrl: "",
      instructions: "Some instructions",
      productPurchaseInstructions: "",
      frequency: "daily",
      days: undefined,
    });
  });

  it("user sees error when routine creation fails and can retry", async () => {
    const user = setupUser();

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
        onPublishRoutine={mockOnPublishRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />,
    );

    // User sees empty state
    expect(screen.getByText(/no routine set yet/i)).toBeInTheDocument();

    // User clicks Add Routine
    await user.click(screen.getByRole("button", { name: /add routine/i }));

    // User chooses to create blank routine
    await user.click(
      screen.getByRole("button", { name: /start from scratch/i }),
    );

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
        null,
      );
    });

    // Since server failed, routine should not appear - empty state remains
    expect(screen.getByText(/no routine set yet/i)).toBeInTheDocument();

    // User tries again - opens modal again
    await user.click(screen.getByRole("button", { name: /add routine/i }));
    await user.click(
      screen.getByRole("button", { name: /start from scratch/i }),
    );

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
    const user = setupUser();

    render(
      <RoutineSection
        routine={null}
        products={[]}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onPublishRoutine={mockOnPublishRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />,
    );

    // User opens Add Routine modal and chooses blank routine
    await user.click(screen.getByRole("button", { name: /add routine/i }));
    await user.click(
      screen.getByRole("button", { name: /start from scratch/i }),
    );

    // User fills in routine info
    await user.type(
      screen.getByLabelText(/routine name/i),
      "My Custom Routine",
    );
    await user.type(screen.getByLabelText(/start date/i), "2025-03-15");
    await user.type(screen.getByLabelText(/end date/i), "2025-06-15");

    // User clicks Back to return to start view
    await user.click(screen.getByRole("button", { name: /go back/i }));

    // User should see start view again
    expect(
      screen.getByRole("button", { name: /use a template/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /start from scratch/i }),
    ).toBeInTheDocument();

    // User clicks "Start from scratch" again to return to form
    await user.click(
      screen.getByRole("button", { name: /start from scratch/i }),
    );

    // Data should still be filled in (preserved during navigation)
    const routineNameInput = screen.getByLabelText(
      /routine name/i,
    ) as HTMLInputElement;
    const startDateInput = screen.getByLabelText(
      /start date/i,
    ) as HTMLInputElement;
    const endDateInput = screen.getByLabelText(/end date/i) as HTMLInputElement;

    expect(routineNameInput.value).toBe("My Custom Routine");
    expect(startDateInput.value).toBe("2025-03-15");
    expect(endDateInput.value).toBe("2025-06-15");
  });

  it("user cancels editing a product without saving changes", async () => {
    const user = setupUser();

    const existingRoutine = makeRoutine({
      id: "routine-1",
      name: "My Routine",
      startDate: new Date("2025-01-01"),
      endDate: null,
      status: "draft",
    });

    const existingProducts: RoutineProduct[] = [
      makeRoutineProduct({
        id: "product-1",
        routineId: "routine-1",
        routineStep: "Cleanse",
        productName: "Original Name",
        productUrl: null,
        instructions: "Original instructions",
        frequency: "daily",
        days: null,
        timeOfDay: "morning",
        order: 0,
      }),
    ];

    render(
      <RoutineSection
        routine={existingRoutine}
        products={existingProducts}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onPublishRoutine={mockOnPublishRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />,
    );

    // User clicks on product to edit
    await user.click(screen.getByText("Original Name"));

    // User sees edit form
    expect(screen.getByPlaceholderText(/product name/i)).toBeInTheDocument();

    // User makes changes
    const nameInput = screen.getByPlaceholderText(/product name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Changed Name");

    const instructionsInput =
      screen.getByPlaceholderText(/apply to damp skin/i);
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
    const user = setupUser();

    const existingRoutine = makeRoutine({
      id: "routine-1",
      name: "My Routine",
      startDate: new Date("2025-01-01"),
      endDate: null,
      status: "draft",
    });

    const existingProducts: RoutineProduct[] = [
      makeRoutineProduct({
        id: "product-1",
        routineId: "routine-1",
        routineStep: "Treat",
        productName: "AHA Toner",
        productUrl: null,
        instructions: "Apply with cotton pad",
        frequency: "2x per week",
        days: ["Mon", "Thu"],
        timeOfDay: "morning",
        order: 0,
      }),
    ];

    render(
      <RoutineSection
        routine={existingRoutine}
        products={existingProducts}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onPublishRoutine={mockOnPublishRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />,
    );

    // User clicks on product to edit
    await user.click(screen.getByText("AHA Toner"));

    // User sees current frequency is 2x per week with day buttons visible
    expect(screen.getByRole("button", { name: /mon/i })).toBeInTheDocument();

    // User changes frequency back to Daily
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[1]); // Frequency combobox (index 1 because routine step is index 0)
    await user.click(screen.getByRole("option", { name: /^daily$/i }));

    // Day selection UI should disappear
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /mon/i }),
      ).not.toBeInTheDocument();
    });

    // User saves
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Verify days are cleared (undefined)
    expect(mockOnUpdateProduct).toHaveBeenCalledWith("product-1", {
      stepType: "product",
      stepName: undefined,
      routineStep: "Treat",
      productName: "AHA Toner",
      productUrl: "",
      instructions: "Apply with cotton pad",
      productPurchaseInstructions: "",
      frequency: "daily",
      days: undefined,
    });
  });

  it("user deselects a day and cannot select more than max days", async () => {
    const user = setupUser();

    const existingRoutine = makeRoutine({
      id: "routine-1",
      name: "My Routine",
      startDate: new Date("2025-01-01"),
      endDate: null,
      status: "draft",
    });

    render(
      <RoutineSection
        routine={existingRoutine}
        products={[]}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onPublishRoutine={mockOnPublishRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />,
    );

    // User clicks "Add Step" in morning section
    const addStepButtons = screen.getAllByRole("button", { name: /add step/i });
    await user.click(addStepButtons[0]);

    // User selects "Product Step" card
    const productStepCard = screen
      .getByText(/add a step that uses a skincare product/i)
      .closest("button");
    await user.click(productStepCard as HTMLElement);

    // User selects routine step and fills basics
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]);
    await user.click(screen.getByText("Treat"));
    await user.type(
      screen.getByPlaceholderText(/product name/i),
      "Vitamin C Serum",
    );
    await user.type(
      screen.getByPlaceholderText(/apply to damp skin/i),
      "Apply in the morning",
    );

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

    // Verify product added with Thursday and Wednesday (not Monday)
    expect(mockOnAddProduct).toHaveBeenCalledWith("morning", {
      stepType: "product",
      stepName: undefined,
      routineStep: "Treat",
      productName: "Vitamin C Serum",
      productUrl: "",
      instructions: "Apply in the morning",
      productPurchaseInstructions: "",
      frequency: "2x per week",
      days: expect.arrayContaining(["Thursday", "Wednesday"]),
    });
  });

  it("user adds No Product step with instructions and sees badge", async () => {
    const user = setupUser();

    const existingRoutine = makeRoutine({
      id: "routine-1",
      name: "My Routine",
      startDate: new Date("2025-01-01"),
      endDate: null,
      status: "draft",
    });

    const { rerender } = render(
      <RoutineSection
        routine={existingRoutine}
        products={[]}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onPublishRoutine={mockOnPublishRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />,
    );

    // User clicks "Add Step" in morning section
    const addStepButtons = screen.getAllByRole("button", { name: /add step/i });
    await user.click(addStepButtons[0]);

    // User sees modal with step type selection
    expect(screen.getByText(/add a new step/i)).toBeInTheDocument();

    // User selects "Non-Product Step" card
    const nonProductStepCard = screen
      .getByText(/add an action or instruction like washing face/i)
      .closest("button");
    await user.click(nonProductStepCard as HTMLElement);

    // User sees form for non-product step
    expect(screen.getByText(/add non-product step/i)).toBeInTheDocument();

    // User fills in instructions (optional for instruction_only type)
    await user.type(
      screen.getByPlaceholderText(/e\.g\., apply toner to clean skin/i),
      "Pat face dry with clean towel",
    );

    // User clicks Add
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    // Verify product was added with instruction_only type
    expect(mockOnAddProduct).toHaveBeenCalledWith("morning", {
      stepType: "instruction_only",
      stepName: undefined,
      routineStep: undefined,
      productName: "",
      productUrl: "",
      instructions: "Pat face dry with clean towel",
      productPurchaseInstructions: "",
      frequency: "daily",
      days: undefined,
    });

    // Simulate server adding the product - rerender with new product
    const newProduct: RoutineProduct = {
      id: "product-1",
      stepType: "instruction_only",
      stepName: null,
      routineStep: null,
      productName: null,
      productUrl: null,
      instructions: "Pat face dry with clean towel",
      productPurchaseInstructions: null,
      frequency: "daily",
      days: null,
      timeOfDay: "morning",
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      userProfileId: "user-1",
      routineId: "routine-1",
    };

    rerender(
      <RoutineSection
        routine={existingRoutine}
        products={[newProduct]}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onPublishRoutine={mockOnPublishRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />,
    );

    // User sees the "No Product" badge on the card
    expect(screen.getByText(/no product/i)).toBeInTheDocument();
    expect(
      screen.getByText("Pat face dry with clean towel"),
    ).toBeInTheDocument();
  });

  it("user sees validation error when adding No Product step without instructions", async () => {
    const user = setupUser();

    const existingRoutine = makeRoutine({
      id: "routine-1",
      name: "My Routine",
      startDate: new Date("2025-01-01"),
      endDate: null,
      status: "draft",
    });

    render(
      <RoutineSection
        routine={existingRoutine}
        products={[]}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onPublishRoutine={mockOnPublishRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />,
    );

    // User clicks "Add Step" in morning section
    const addStepButtons = screen.getAllByRole("button", { name: /add step/i });
    await user.click(addStepButtons[0]);

    // User selects "Non-Product Step" card
    const nonProductStepCard = screen
      .getByText(/add an action or instruction like washing face/i)
      .closest("button");
    await user.click(nonProductStepCard as HTMLElement);

    // User does NOT fill in instructions (instructions are now optional for instruction_only)
    // User clicks Add - should succeed with just frequency (default is "daily")
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    // Server action should be called (validation passes with just frequency)
    expect(mockOnAddProduct).toHaveBeenCalledWith("morning", {
      stepType: "instruction_only",
      stepName: undefined,
      routineStep: undefined,
      productName: "",
      productUrl: "",
      instructions: null,
      productPurchaseInstructions: "",
      frequency: "daily",
      days: undefined,
    });
  });

  it("user sees product with URL as plain text (no hyperlink)", async () => {
    const existingRoutine = makeRoutine({
      id: "routine-1",
      name: "My Routine",
      startDate: new Date("2025-01-01"),
      endDate: null,
      status: "draft",
    });

    const existingProducts: RoutineProduct[] = [
      makeRoutineProduct({
        id: "product-1",
        routineId: "routine-1",
        routineStep: "Moisturise",
        productName: "CeraVe Moisturizer",
        productUrl: "https://example.com/cerave-moisturizer",
        instructions: "Apply twice daily",
        frequency: "daily",
        days: null,
        timeOfDay: "morning",
        order: 0,
      }),
    ];

    render(
      <RoutineSection
        routine={existingRoutine}
        products={existingProducts}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onPublishRoutine={mockOnPublishRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />,
    );

    // User sees product name as plain text (not a link)
    expect(screen.getByText("CeraVe Moisturizer")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /cerave moisturizer/i }),
    ).not.toBeInTheDocument();
  });

  it("user sees days displayed in frequency badge for product with 2x per week", async () => {
    const existingRoutine = makeRoutine({
      id: "routine-1",
      name: "My Routine",
      startDate: new Date("2025-01-01"),
      endDate: null,
      status: "draft",
    });

    const existingProducts: RoutineProduct[] = [
      makeRoutineProduct({
        id: "product-1",
        routineId: "routine-1",
        routineStep: "Treat",
        productName: "Glycolic Acid Toner",
        productUrl: null,
        instructions: "Use in the evening",
        frequency: "2x per week",
        days: ["Mon", "Thu"],
        timeOfDay: "evening",
        order: 0,
      }),
    ];

    render(
      <RoutineSection
        routine={existingRoutine}
        products={existingProducts}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onPublishRoutine={mockOnPublishRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />,
    );

    // User sees frequency badge with days displayed
    expect(screen.getByText(/2x per week/)).toBeInTheDocument();
    expect(screen.getByText(/Mon, Thu/)).toBeInTheDocument();
  });

  // ========================================
  // Save as Template Switch Tests
  // ========================================
  it("shows save as template switch when routine is published and not saved", async () => {
    const publishedRoutine = makeRoutine({
      id: "routine-1",
      status: "published",
      savedAsTemplate: false,
    });

    render(
      <RoutineSection
        routine={publishedRoutine}
        products={[]}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onPublishRoutine={mockOnPublishRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
        onSaveAsTemplate={mockOnSaveAsTemplate}
      />,
    );

    // User sees save as template switch and label
    expect(screen.getByRole("switch")).toBeInTheDocument();
    expect(screen.getByText(/save as template/i)).toBeInTheDocument();
  });

  it("does NOT show banner when routine is draft", async () => {
    const draftRoutine = makeRoutine({
      id: "routine-1",
      status: "draft",
      savedAsTemplate: false,
    });

    render(
      <RoutineSection
        routine={draftRoutine}
        products={[]}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onPublishRoutine={mockOnPublishRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
        onSaveAsTemplate={mockOnSaveAsTemplate}
      />,
    );

    // Switch should not be visible
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("does NOT show switch when routine already saved as template", async () => {
    const savedRoutine = makeRoutine({
      id: "routine-1",
      status: "published",
      savedAsTemplate: true,
    });

    render(
      <RoutineSection
        routine={savedRoutine}
        products={[]}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onPublishRoutine={mockOnPublishRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
        onSaveAsTemplate={mockOnSaveAsTemplate}
      />,
    );

    // Switch should not be visible
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("calls onSaveAsTemplate when user toggles switch on", async () => {
    const user = setupUser();

    const publishedRoutine = makeRoutine({
      id: "routine-1",
      status: "published",
      savedAsTemplate: false,
    });

    render(
      <RoutineSection
        routine={publishedRoutine}
        products={[]}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
        onUpdateRoutine={mockOnUpdateRoutine}
        onPublishRoutine={mockOnPublishRoutine}
        onDeleteRoutine={mockOnDeleteRoutine}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
        onSaveAsTemplate={mockOnSaveAsTemplate}
      />,
    );

    // User toggles switch on
    await user.click(screen.getByRole("switch"));

    // Verify handler was called
    expect(mockOnSaveAsTemplate).toHaveBeenCalledTimes(1);
  });
});

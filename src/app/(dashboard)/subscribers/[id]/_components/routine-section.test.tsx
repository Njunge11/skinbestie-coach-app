import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RoutineSection } from "./routine-section";
import type { RoutineProduct } from "../types";

describe("RoutineSection - UI Tests", () => {
  // Mock server actions at the network boundary
  const mockOnAddProduct = vi.fn();
  const mockOnUpdateProduct = vi.fn();
  const mockOnDeleteProduct = vi.fn();
  const mockOnReorderProducts = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("user adds a morning routine product with all fields", async () => {
    const user = userEvent.setup();

    render(
      <RoutineSection
        products={[]}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User sees empty states (both morning and evening)
    expect(screen.getAllByText(/no routine set/i)).toHaveLength(2);

    // User clicks Add Step for morning
    const addButtons = screen.getAllByRole("button", { name: /add step/i });
    await user.click(addButtons[0]); // First one is morning

    // User selects routine step (first combobox)
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]); // Routine step combobox
    await user.click(screen.getByText("Cleanser"));

    // User fills in product name
    await user.type(screen.getByPlaceholderText(/product name/i), "CeraVe Hydrating Cleanser");

    // User fills in product URL (optional)
    await user.type(
      screen.getByPlaceholderText(/product url/i),
      "https://example.com/product"
    );

    // User fills in instructions
    await user.type(
      screen.getByPlaceholderText(/instructions/i),
      "Apply to damp skin, massage gently"
    );

    // Frequency defaults to "Daily" - no need to change

    // User clicks Add button
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    // Server action called with correct data
    expect(mockOnAddProduct).toHaveBeenCalledWith("morning", {
      routineStep: "Cleanser",
      productName: "CeraVe Hydrating Cleanser",
      productUrl: "https://example.com/product",
      instructions: "Apply to damp skin, massage gently",
      frequency: "Daily",
      days: undefined,
    });
  });

  it("user cannot add product without routineStep", async () => {
    const user = userEvent.setup();

    render(
      <RoutineSection
        products={[]}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User clicks Add Step
    const addButtons = screen.getAllByRole("button", { name: /add step/i });
    await user.click(addButtons[0]);

    // User fills product name and instructions but not routine step
    await user.type(screen.getByPlaceholderText(/product name/i), "Some Product");
    await user.type(screen.getByPlaceholderText(/instructions/i), "Apply daily");

    // User tries to add
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    // Server action not called
    expect(mockOnAddProduct).not.toHaveBeenCalled();
  });

  it("user cannot add product without productName", async () => {
    const user = userEvent.setup();

    render(
      <RoutineSection
        products={[]}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User clicks Add Step
    const addButtons = screen.getAllByRole("button", { name: /add step/i });
    await user.click(addButtons[0]);

    // User selects routine step (first combobox)
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]); // Routine step combobox
    await user.click(screen.getByText("Cleanser"));

    // User fills instructions but not product name
    await user.type(screen.getByPlaceholderText(/instructions/i), "Apply daily");

    // User tries to add
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    // Server action not called
    expect(mockOnAddProduct).not.toHaveBeenCalled();
  });

  it("user cannot add product without instructions", async () => {
    const user = userEvent.setup();

    render(
      <RoutineSection
        products={[]}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User clicks Add Step
    const addButtons = screen.getAllByRole("button", { name: /add step/i });
    await user.click(addButtons[0]);

    // User selects routine step (first combobox)
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]); // Routine step combobox
    await user.click(screen.getByText("Cleanser"));

    // User fills product name but not instructions
    await user.type(screen.getByPlaceholderText(/product name/i), "Some Product");

    // User tries to add
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    // Server action not called
    expect(mockOnAddProduct).not.toHaveBeenCalled();
  });

  it("user cannot add product with whitespace-only fields", async () => {
    const user = userEvent.setup();

    render(
      <RoutineSection
        products={[]}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User clicks Add Step
    const addButtons = screen.getAllByRole("button", { name: /add step/i });
    await user.click(addButtons[0]);

    // User selects routine step (first combobox)
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]); // Routine step combobox
    await user.click(screen.getByText("Cleanser"));

    // User fills with whitespace
    await user.type(screen.getByPlaceholderText(/product name/i), "   ");
    await user.type(screen.getByPlaceholderText(/instructions/i), "   ");

    // User tries to add
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    // Server action not called
    expect(mockOnAddProduct).not.toHaveBeenCalled();
  });

  it("user cancels adding a product", async () => {
    const user = userEvent.setup();

    render(
      <RoutineSection
        products={[]}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User clicks Add Step
    const addButtons = screen.getAllByRole("button", { name: /add step/i });
    await user.click(addButtons[0]);

    // User types something
    await user.type(screen.getByPlaceholderText(/product name/i), "Test Product");

    // User clicks Cancel
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    // Server action not called
    expect(mockOnAddProduct).not.toHaveBeenCalled();

    // Form is closed - Add Step button visible again
    expect(screen.getAllByRole("button", { name: /add step/i })[0]).toBeInTheDocument();
  });

  it("user adds an evening routine product", async () => {
    const user = userEvent.setup();

    render(
      <RoutineSection
        products={[]}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User clicks Add Step for evening (second button)
    const addButtons = screen.getAllByRole("button", { name: /add step/i });
    await user.click(addButtons[1]); // Second one is evening

    // User selects routine step (first combobox)
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]); // Routine step combobox
    await user.click(screen.getByText("Moisturizer / Cream"));

    // User fills in fields
    await user.type(screen.getByPlaceholderText(/product name/i), "Night Cream");
    await user.type(screen.getByPlaceholderText(/instructions/i), "Apply before bed");

    // User clicks Add
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    // Server action called with timeOfDay = "evening"
    expect(mockOnAddProduct).toHaveBeenCalledWith("evening", {
      routineStep: "Moisturizer / Cream",
      productName: "Night Cream",
      productUrl: "",
      instructions: "Apply before bed",
      frequency: "Daily",
      days: undefined,
    });
  });

  it("user edits an existing routine product", async () => {
    const user = userEvent.setup();

    const existingProducts: RoutineProduct[] = [
      {
        id: "product_1",
        routineStep: "Cleanser",
        productName: "Old Cleanser",
        instructions: "Old instructions",
        frequency: "Daily",
        timeOfDay: "morning",
      },
    ];

    render(
      <RoutineSection
        products={existingProducts}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User sees existing product
    expect(screen.getByText("Old Cleanser")).toBeInTheDocument();

    // User clicks on product to edit
    await user.click(screen.getByText("Old Cleanser"));

    // User sees input fields with current values
    expect(screen.getByDisplayValue("Old Cleanser")).toBeInTheDocument();

    // User updates product name
    const nameInput = screen.getByPlaceholderText(/product name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "New Cleanser");

    // User clicks Save
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Server action called
    expect(mockOnUpdateProduct).toHaveBeenCalledWith("product_1", {
      routineStep: "Cleanser",
      productName: "New Cleanser",
      productUrl: undefined,
      instructions: "Old instructions",
      frequency: "Daily",
      days: undefined,
    });
  });

  it("user cannot edit product with empty productName", async () => {
    const user = userEvent.setup();

    const existingProducts: RoutineProduct[] = [
      {
        id: "product_1",
        routineStep: "Cleanser",
        productName: "CeraVe Cleanser",
        instructions: "Instructions",
        frequency: "Daily",
        timeOfDay: "morning",
      },
    ];

    render(
      <RoutineSection
        products={existingProducts}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User clicks on product to edit
    await user.click(screen.getByText("CeraVe Cleanser"));

    // User clears product name
    const nameInput = screen.getByPlaceholderText(/product name/i);
    await user.clear(nameInput);

    // User tries to save
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Server action not called
    expect(mockOnUpdateProduct).not.toHaveBeenCalled();
  });

  it("user cannot edit product with empty instructions", async () => {
    const user = userEvent.setup();

    const existingProducts: RoutineProduct[] = [
      {
        id: "product_1",
        routineStep: "Cleanser",
        productName: "CeraVe Cleanser",
        instructions: "Valid instructions",
        frequency: "Daily",
        timeOfDay: "morning",
      },
    ];

    render(
      <RoutineSection
        products={existingProducts}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User clicks on product to edit
    await user.click(screen.getByText("CeraVe Cleanser"));

    // User clears instructions
    const instructionsInput = screen.getByPlaceholderText(/instructions/i);
    await user.clear(instructionsInput);

    // User tries to save
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Server action not called
    expect(mockOnUpdateProduct).not.toHaveBeenCalled();
  });

  it("user deletes a routine product", async () => {
    const user = userEvent.setup();

    const existingProducts: RoutineProduct[] = [
      {
        id: "product_1",
        routineStep: "Cleanser",
        productName: "Test Cleanser",
        instructions: "Apply daily",
        frequency: "Daily",
        timeOfDay: "morning",
      },
    ];

    render(
      <RoutineSection
        products={existingProducts}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User sees the product
    expect(screen.getByText("Test Cleanser")).toBeInTheDocument();

    // User clicks delete button
    await user.click(screen.getByLabelText(/delete step/i));

    // Server action called
    expect(mockOnDeleteProduct).toHaveBeenCalledWith("product_1");
  });

  it("user adds product with 2x per week frequency and selects days", async () => {
    const user = userEvent.setup();

    render(
      <RoutineSection
        products={[]}
        onAddProduct={mockOnAddProduct}
        onUpdateProduct={mockOnUpdateProduct}
        onDeleteProduct={mockOnDeleteProduct}
        onReorderProducts={mockOnReorderProducts}
      />
    );

    // User clicks Add Step
    const addButtons = screen.getAllByRole("button", { name: /add step/i });
    await user.click(addButtons[0]);

    // User selects routine step (first combobox)
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]); // Routine step combobox
    await user.click(screen.getByText("Exfoliant / Peel"));

    // User fills in fields
    await user.type(screen.getByPlaceholderText(/product name/i), "AHA Toner");
    await user.type(screen.getByPlaceholderText(/instructions/i), "Apply with cotton pad");

    // User changes frequency to 2x per week (second combobox)
    const comboboxesAfter = screen.getAllByRole("combobox");
    await user.click(comboboxesAfter[1]); // Frequency combobox
    await user.click(screen.getByText("2x per week"));

    // Days selector appears
    expect(screen.getByText("Select 2 days")).toBeInTheDocument();

    // User selects Mon and Thu
    await user.click(screen.getByRole("button", { name: /mon/i }));
    await user.click(screen.getByRole("button", { name: /thu/i }));

    // User clicks Add
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    // Server action called with days
    expect(mockOnAddProduct).toHaveBeenCalledWith("morning", {
      routineStep: "Exfoliant / Peel",
      productName: "AHA Toner",
      productUrl: "",
      instructions: "Apply with cotton pad",
      frequency: "2x per week",
      days: ["Mon", "Thu"],
    });
  });
});

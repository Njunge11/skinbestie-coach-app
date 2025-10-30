import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/utils";
import userEvent from "@testing-library/user-event";
import React from "react";
import { ProductForm, ProductFormData } from "./product-form";

describe("ProductForm", () => {
  it("user fills complete product form with Daily frequency", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onSave = vi.fn();
    const onCancel = vi.fn();

    const initialData: ProductFormData = {
      routineStep: "",
      productName: "",
      productUrl: null,
      instructions: "",
      frequency: "daily",
      days: undefined,
    };

    render(
      <ProductForm
        data={initialData}
        onChange={onChange}
        onSave={onSave}
        onCancel={onCancel}
        saveLabel="Add"
      />,
    );

    // User clicks routine step combobox (find by text content)
    const routineStepButton = screen.getByText(/select routine step/i);
    await user.click(routineStepButton);

    // User selects "Cleanser" from the list
    await user.click(screen.getByRole("option", { name: /cleanser/i }));

    // User fills product name
    const productNameInput = screen.getByPlaceholderText(/product name/i);
    await user.type(productNameInput, "CeraVe Hydrating Cleanser");

    // User fills product URL
    const productUrlInput = screen.getByPlaceholderText(/product url/i);
    await user.type(productUrlInput, "https://example.com/product");

    // User fills instructions
    const instructionsInput = screen.getByLabelText(/^instructions$/i);
    await user.type(instructionsInput, "Apply to damp skin, massage gently");

    // Frequency is already "Daily" by default - no days selection shown

    // User clicks Add/Save button
    await user.click(screen.getByRole("button", { name: /add/i }));

    // onSave should be called
    expect(onSave).toHaveBeenCalled();
  });

  it("user creates product without optional URL", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onSave = vi.fn();
    const onCancel = vi.fn();

    const initialData: ProductFormData = {
      routineStep: "",
      productName: "",
      productUrl: null,
      instructions: "",
      frequency: "daily",
      days: undefined,
    };

    render(
      <ProductForm
        data={initialData}
        onChange={onChange}
        onSave={onSave}
        onCancel={onCancel}
        saveLabel="Add"
      />,
    );

    // User selects routine step
    const routineStepButton = screen.getByText(/select routine step/i);
    await user.click(routineStepButton);
    await user.click(screen.getByRole("option", { name: /moisturizer/i }));

    // User fills product name
    const productNameInput = screen.getByPlaceholderText(/product name/i);
    await user.type(productNameInput, "Simple Face Cream");

    // User skips product URL (optional field)

    // User fills instructions
    const instructionsInput = screen.getByLabelText(/^instructions$/i);
    await user.type(instructionsInput, "Apply after serum");

    // User clicks Add button
    await user.click(screen.getByRole("button", { name: /add/i }));

    // onSave should be called
    expect(onSave).toHaveBeenCalled();
  });

  it("user selects 2x per week and chooses 2 days", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onCancel = vi.fn();

    // Track form data and implement onChange to update it
    let formData: ProductFormData = {
      routineStep: "",
      productName: "",
      productUrl: null,
      instructions: "",
      frequency: "daily",
      days: undefined,
    };

    const onChange = vi.fn((newData: ProductFormData) => {
      formData = newData;
    });

    // Use a wrapper component to handle re-rendering with updated data
    function FormWrapper() {
      const [data, setData] = React.useState<ProductFormData>(formData);

      return (
        <ProductForm
          data={data}
          onChange={(newData) => {
            setData(newData);
            onChange(newData);
          }}
          onSave={onSave}
          onCancel={onCancel}
          saveLabel="Add"
        />
      );
    }

    render(<FormWrapper />);

    // User selects routine step
    const routineStepButton = screen.getByText(/select routine step/i);
    await user.click(routineStepButton);
    await user.click(screen.getByRole("option", { name: /serum/i }));

    // User fills product name
    const productNameInput = screen.getByPlaceholderText(/product name/i);
    await user.type(productNameInput, "Vitamin C Serum");

    // User fills instructions
    const instructionsInput = screen.getByLabelText(/^instructions$/i);
    await user.type(instructionsInput, "Apply in the morning");

    // User selects "2x per week" frequency
    // Find the select trigger that contains "Daily" (display label)
    const selectTriggers = screen.getAllByRole("combobox");
    const frequencySelect = selectTriggers.find((el) =>
      el.textContent?.includes("Daily"),
    );
    await user.click(frequencySelect!);
    await user.click(screen.getByRole("option", { name: /2x per week/i }));

    // Days selection should now appear
    expect(await screen.findByText(/select 2 days/i)).toBeInTheDocument();

    // User clicks Monday
    await user.click(screen.getByRole("button", { name: /mon/i }));

    // User clicks Wednesday
    await user.click(screen.getByRole("button", { name: /wed/i }));

    // User clicks Add button
    await user.click(screen.getByRole("button", { name: /add/i }));

    // onSave should be called
    expect(onSave).toHaveBeenCalled();
  });

  it("user selects 3x per week and chooses 3 days", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onCancel = vi.fn();

    // Use a wrapper component to handle re-rendering with updated data
    function FormWrapper() {
      const [data, setData] = React.useState<ProductFormData>({
        routineStep: "",
        productName: "",
        productUrl: null,
        instructions: "",
        frequency: "daily",
        days: undefined,
      });

      return (
        <ProductForm
          data={data}
          onChange={setData}
          onSave={onSave}
          onCancel={onCancel}
          saveLabel="Add"
        />
      );
    }

    render(<FormWrapper />);

    // User selects routine step
    const routineStepButton = screen.getByText(/select routine step/i);
    await user.click(routineStepButton);
    await user.click(screen.getByRole("option", { name: /toner/i }));

    // User fills product name
    const productNameInput = screen.getByPlaceholderText(/product name/i);
    await user.type(productNameInput, "Hydrating Toner");

    // User fills instructions
    const instructionsInput = screen.getByLabelText(/^instructions$/i);
    await user.type(instructionsInput, "Apply with cotton pad");

    // User selects "3x per week" frequency
    const selectTriggers = screen.getAllByRole("combobox");
    const frequencySelect = selectTriggers.find((el) =>
      el.textContent?.includes("Daily"),
    );
    await user.click(frequencySelect!);
    await user.click(screen.getByRole("option", { name: /3x per week/i }));

    // Days selection should now appear
    expect(await screen.findByText(/select 3 days/i)).toBeInTheDocument();

    // User clicks Monday, Wednesday, Friday
    await user.click(screen.getByRole("button", { name: /mon/i }));
    await user.click(screen.getByRole("button", { name: /wed/i }));
    await user.click(screen.getByRole("button", { name: /fri/i }));

    // User clicks Add button
    await user.click(screen.getByRole("button", { name: /add/i }));

    // onSave should be called
    expect(onSave).toHaveBeenCalled();
  });

  it("user changes from 2x per week to Daily and days selection disappears", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onCancel = vi.fn();

    // Use a wrapper component to handle re-rendering with updated data
    function FormWrapper() {
      const [data, setData] = React.useState<ProductFormData>({
        routineStep: "",
        productName: "",
        productUrl: null,
        instructions: "",
        frequency: "daily",
        days: undefined,
      });

      return (
        <ProductForm
          data={data}
          onChange={setData}
          onSave={onSave}
          onCancel={onCancel}
          saveLabel="Add"
        />
      );
    }

    render(<FormWrapper />);

    // User selects routine step
    const routineStepButton = screen.getByText(/select routine step/i);
    await user.click(routineStepButton);
    await user.click(screen.getByRole("option", { name: /cleanser/i }));

    // User fills product name
    const productNameInput = screen.getByPlaceholderText(/product name/i);
    await user.type(productNameInput, "Gentle Cleanser");

    // User fills instructions
    const instructionsInput = screen.getByLabelText(/^instructions$/i);
    await user.type(instructionsInput, "Use twice daily");

    // User selects "2x per week" frequency
    const selectTriggers = screen.getAllByRole("combobox");
    let frequencySelect = selectTriggers.find((el) =>
      el.textContent?.includes("Daily"),
    );
    await user.click(frequencySelect!);
    await user.click(screen.getByRole("option", { name: /2x per week/i }));

    // Days selection should appear
    expect(await screen.findByText(/select 2 days/i)).toBeInTheDocument();

    // User clicks Monday and Friday
    await user.click(screen.getByRole("button", { name: /mon/i }));
    await user.click(screen.getByRole("button", { name: /fri/i }));

    // User changes back to "Daily"
    const selectTriggersAgain = screen.getAllByRole("combobox");
    frequencySelect = selectTriggersAgain.find((el) =>
      el.textContent?.includes("2x per week"),
    );
    await user.click(frequencySelect!);
    await user.click(screen.getByRole("option", { name: /^Daily$/i }));

    // Days selection should disappear
    expect(screen.queryByText(/select 2 days/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /mon/i }),
    ).not.toBeInTheDocument();
  });
});

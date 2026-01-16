import { describe, it, expect, vi } from "vitest";
import { render, screen, setupUser } from "@/test/utils";
import React from "react";
import { ProductForm, ProductFormData } from "./product-form";

describe("ProductForm", () => {
  it("user fills complete product form with Daily frequency", async () => {
    const user = setupUser();
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

    // User selects "Cleanse" from the list
    await user.click(screen.getByRole("option", { name: /cleanse/i }));

    // User fills product name
    const productNameInput = screen.getByPlaceholderText(/product name/i);
    await user.type(productNameInput, "CeraVe Hydrating cleanse");

    // User fills product URL
    const productUrlInput = screen.getByPlaceholderText(/product url/i);
    await user.type(productUrlInput, "https://example.com/product");

    // User fills instructions
    const instructionsInput = screen.getByLabelText(/^instructions.*$/i);
    await user.type(instructionsInput, "Apply to damp skin, massage gently");

    // Frequency is already "Daily" by default - no days selection shown

    // User clicks Add/Save button
    await user.click(screen.getByRole("button", { name: /add/i }));

    // onSave should be called
    expect(onSave).toHaveBeenCalled();
  });

  it("user creates product without optional URL", async () => {
    const user = setupUser();
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
    await user.click(screen.getByRole("option", { name: /moisturise/i }));

    // User fills product name
    const productNameInput = screen.getByPlaceholderText(/product name/i);
    await user.type(productNameInput, "Simple Face Cream");

    // User skips product URL (optional field)

    // User fills instructions
    const instructionsInput = screen.getByLabelText(/^instructions.*$/i);
    await user.type(instructionsInput, "Apply after treat");

    // User clicks Add button
    await user.click(screen.getByRole("button", { name: /add/i }));

    // onSave should be called
    expect(onSave).toHaveBeenCalled();
  });

  it("user selects 2x per week and chooses 2 days", async () => {
    const user = setupUser();
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
    await user.click(screen.getByRole("option", { name: /treat/i }));

    // User fills product name
    const productNameInput = screen.getByPlaceholderText(/product name/i);
    await user.type(productNameInput, "Vitamin C treat");

    // User fills instructions
    const instructionsInput = screen.getByLabelText(/^instructions.*$/i);
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
    expect(
      await screen.findByRole("button", { name: /mon/i }),
    ).toBeInTheDocument();

    // No error message yet (user hasn't interacted)
    expect(
      screen.queryByText(/please select exactly 2 days/i),
    ).not.toBeInTheDocument();

    // User clicks Monday (first interaction)
    await user.click(screen.getByRole("button", { name: /mon/i }));

    // Error message should now appear (only 1 day selected, need 2)
    expect(
      screen.getByText(/please select exactly 2 days/i),
    ).toBeInTheDocument();

    // User clicks Wednesday
    await user.click(screen.getByRole("button", { name: /wed/i }));

    // Error message should now be gone (2 days selected)
    expect(
      screen.queryByText(/please select exactly 2 days/i),
    ).not.toBeInTheDocument();

    // User clicks Add button
    await user.click(screen.getByRole("button", { name: /add/i }));

    // onSave should be called
    expect(onSave).toHaveBeenCalled();
  });

  it("user selects 3x per week and chooses 3 days", async () => {
    const user = setupUser();
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
    const instructionsInput = screen.getByLabelText(/^instructions.*$/i);
    await user.type(instructionsInput, "Apply with cotton pad");

    // User selects "3x per week" frequency
    const selectTriggers = screen.getAllByRole("combobox");
    const frequencySelect = selectTriggers.find((el) =>
      el.textContent?.includes("Daily"),
    );
    await user.click(frequencySelect!);
    await user.click(screen.getByRole("option", { name: /3x per week/i }));

    // Days selection should now appear
    expect(
      await screen.findByRole("button", { name: /mon/i }),
    ).toBeInTheDocument();

    // No error message yet (user hasn't interacted)
    expect(
      screen.queryByText(/please select exactly 3 days/i),
    ).not.toBeInTheDocument();

    // User clicks Monday, Wednesday, Friday
    await user.click(screen.getByRole("button", { name: /mon/i }));
    await user.click(screen.getByRole("button", { name: /wed/i }));
    await user.click(screen.getByRole("button", { name: /fri/i }));

    // Error message should not appear (3 days selected correctly)
    expect(
      screen.queryByText(/please select exactly 3 days/i),
    ).not.toBeInTheDocument();

    // User clicks Add button
    await user.click(screen.getByRole("button", { name: /add/i }));

    // onSave should be called
    expect(onSave).toHaveBeenCalled();
  });

  it("user changes from 2x per week to Daily and days selection disappears", async () => {
    const user = setupUser();
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
    await user.click(screen.getByRole("option", { name: /cleanse/i }));

    // User fills product name
    const productNameInput = screen.getByPlaceholderText(/product name/i);
    await user.type(productNameInput, "Gentle cleanse");

    // User fills instructions
    const instructionsInput = screen.getByLabelText(/^instructions.*$/i);
    await user.type(instructionsInput, "Use twice daily");

    // User selects "2x per week" frequency
    const selectTriggers = screen.getAllByRole("combobox");
    let frequencySelect = selectTriggers.find((el) =>
      el.textContent?.includes("Daily"),
    );
    await user.click(frequencySelect!);
    await user.click(screen.getByRole("option", { name: /2x per week/i }));

    // Days selection should appear
    expect(
      await screen.findByRole("button", { name: /mon/i }),
    ).toBeInTheDocument();

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

  describe("Error Message Interaction Behavior", () => {
    it("error message does NOT appear immediately after selecting non-daily frequency", async () => {
      const user = setupUser();

      function FormWrapper() {
        const [data, setData] = React.useState<ProductFormData>({
          routineStep: "Cleanse",
          productName: "Test Product",
          productUrl: null,
          instructions: "",
          frequency: "daily",
          days: undefined,
        });

        return (
          <ProductForm
            data={data}
            onChange={setData}
            onSave={vi.fn()}
            onCancel={vi.fn()}
            saveLabel="Add"
          />
        );
      }

      render(<FormWrapper />);

      // User selects "3x per week" frequency
      const selectTriggers = screen.getAllByRole("combobox");
      const frequencySelect = selectTriggers.find((el) =>
        el.textContent?.includes("Daily"),
      );
      await user.click(frequencySelect!);
      await user.click(screen.getByRole("option", { name: /3x per week/i }));

      // Day buttons should appear
      expect(
        await screen.findByRole("button", { name: /mon/i }),
      ).toBeInTheDocument();

      // Error message should NOT appear (no interaction yet)
      expect(
        screen.queryByText(/please select exactly 3 days/i),
      ).not.toBeInTheDocument();
    });

    it("error message appears after first day button click with insufficient days", async () => {
      const user = setupUser();

      function FormWrapper() {
        const [data, setData] = React.useState<ProductFormData>({
          routineStep: "Cleanse",
          productName: "Test Product",
          productUrl: null,
          instructions: "",
          frequency: "2x per week",
          days: undefined,
        });

        return (
          <ProductForm
            data={data}
            onChange={setData}
            onSave={vi.fn()}
            onCancel={vi.fn()}
            saveLabel="Add"
          />
        );
      }

      render(<FormWrapper />);

      // No error initially
      expect(
        screen.queryByText(/please select exactly 2 days/i),
      ).not.toBeInTheDocument();

      // User clicks Monday (1 day selected, need 2)
      await user.click(screen.getByRole("button", { name: /mon/i }));

      // Error message should now appear
      expect(
        screen.getByText(/please select exactly 2 days/i),
      ).toBeInTheDocument();
    });

    it("error message disappears when correct number of days selected", async () => {
      const user = setupUser();

      function FormWrapper() {
        const [data, setData] = React.useState<ProductFormData>({
          routineStep: "Cleanse",
          productName: "Test Product",
          productUrl: null,
          instructions: "",
          frequency: "2x per week",
          days: undefined,
        });

        return (
          <ProductForm
            data={data}
            onChange={setData}
            onSave={vi.fn()}
            onCancel={vi.fn()}
            saveLabel="Add"
          />
        );
      }

      render(<FormWrapper />);

      // Click Monday (error will appear)
      await user.click(screen.getByRole("button", { name: /mon/i }));
      expect(
        screen.getByText(/please select exactly 2 days/i),
      ).toBeInTheDocument();

      // Click Tuesday (now have 2 days, error should disappear)
      await user.click(screen.getByRole("button", { name: /tue/i }));
      expect(
        screen.queryByText(/please select exactly 2 days/i),
      ).not.toBeInTheDocument();
    });

    it("error message appears when clicking Save with no days selected", async () => {
      const user = setupUser();
      const onSave = vi.fn();

      function FormWrapper() {
        const [data, setData] = React.useState<ProductFormData>({
          routineStep: "Cleanse",
          productName: "Test Product",
          productUrl: null,
          instructions: "",
          frequency: "3x per week",
          days: undefined,
        });

        return (
          <ProductForm
            data={data}
            onChange={setData}
            onSave={onSave}
            onCancel={vi.fn()}
            saveLabel="Add"
          />
        );
      }

      render(<FormWrapper />);

      // No error initially
      expect(
        screen.queryByText(/please select exactly 3 days/i),
      ).not.toBeInTheDocument();

      // Click Save button without selecting days
      await user.click(screen.getByRole("button", { name: /add/i }));

      // Error message should now appear
      expect(
        screen.getByText(/please select exactly 3 days/i),
      ).toBeInTheDocument();
    });

    it("error message appears when clicking Save with wrong number of days", async () => {
      const user = setupUser();
      const onSave = vi.fn();

      function FormWrapper() {
        const [data, setData] = React.useState<ProductFormData>({
          routineStep: "Cleanse",
          productName: "Test Product",
          productUrl: null,
          instructions: "",
          frequency: "4x per week",
          days: ["Mon", "Tue"], // Only 2 days, need 4
        });

        return (
          <ProductForm
            data={data}
            onChange={setData}
            onSave={onSave}
            onCancel={vi.fn()}
            saveLabel="Add"
          />
        );
      }

      render(<FormWrapper />);

      // No error initially (user hasn't interacted yet)
      expect(
        screen.queryByText(/please select exactly 4 days/i),
      ).not.toBeInTheDocument();

      // Click Save button with wrong number of days
      await user.click(screen.getByRole("button", { name: /add/i }));

      // Error message should now appear
      expect(
        screen.getByText(/please select exactly 4 days/i),
      ).toBeInTheDocument();
    });

    it("error persists when user has wrong number selected and keeps interacting", async () => {
      const user = setupUser();

      function FormWrapper() {
        const [data, setData] = React.useState<ProductFormData>({
          routineStep: "Cleanse",
          productName: "Test Product",
          productUrl: null,
          instructions: "",
          frequency: "3x per week",
          days: undefined,
        });

        return (
          <ProductForm
            data={data}
            onChange={setData}
            onSave={vi.fn()}
            onCancel={vi.fn()}
            saveLabel="Add"
          />
        );
      }

      render(<FormWrapper />);

      // Click Monday
      await user.click(screen.getByRole("button", { name: /mon/i }));
      expect(
        screen.getByText(/please select exactly 3 days/i),
      ).toBeInTheDocument();

      // Click Tuesday (still only 2 days, error should persist)
      await user.click(screen.getByRole("button", { name: /tue/i }));
      expect(
        screen.getByText(/please select exactly 3 days/i),
      ).toBeInTheDocument();

      // Click Wednesday (now have 3 days, error should disappear)
      await user.click(screen.getByRole("button", { name: /wed/i }));
      expect(
        screen.queryByText(/please select exactly 3 days/i),
      ).not.toBeInTheDocument();

      // Unclick Wednesday (back to 2 days, error should reappear)
      await user.click(screen.getByRole("button", { name: /wed/i }));
      expect(
        screen.getByText(/please select exactly 3 days/i),
      ).toBeInTheDocument();
    });

    it("specific_days frequency shows error after interaction with 0 days", async () => {
      const user = setupUser();

      function FormWrapper() {
        const [data, setData] = React.useState<ProductFormData>({
          routineStep: "Cleanse",
          productName: "Test Product",
          productUrl: null,
          instructions: "",
          frequency: "specific_days",
          days: undefined,
        });

        return (
          <ProductForm
            data={data}
            onChange={setData}
            onSave={vi.fn()}
            onCancel={vi.fn()}
            saveLabel="Add"
          />
        );
      }

      render(<FormWrapper />);

      // No error initially
      expect(
        screen.queryByText(/please select at least 1 day/i),
      ).not.toBeInTheDocument();

      // Click Save button without selecting days
      await user.click(screen.getByRole("button", { name: /add/i }));

      // Error message should now appear for specific_days
      expect(
        screen.getByText(/please select at least 1 day/i),
      ).toBeInTheDocument();
    });

    it("specific_days error disappears after selecting any day", async () => {
      const user = setupUser();

      function FormWrapper() {
        const [data, setData] = React.useState<ProductFormData>({
          routineStep: "Cleanse",
          productName: "Test Product",
          productUrl: null,
          instructions: "",
          frequency: "specific_days",
          days: undefined,
        });

        return (
          <ProductForm
            data={data}
            onChange={setData}
            onSave={vi.fn()}
            onCancel={vi.fn()}
            saveLabel="Add"
          />
        );
      }

      render(<FormWrapper />);

      // Click Save to trigger error
      await user.click(screen.getByRole("button", { name: /add/i }));
      expect(
        screen.getByText(/please select at least 1 day/i),
      ).toBeInTheDocument();

      // Click Monday (1 day is enough for specific_days)
      await user.click(screen.getByRole("button", { name: /mon/i }));

      // Error should disappear
      expect(
        screen.queryByText(/please select at least 1 day/i),
      ).not.toBeInTheDocument();
    });

    it("no error for daily frequency (no days required)", async () => {
      const user = setupUser();
      const onSave = vi.fn();

      function FormWrapper() {
        const [data, setData] = React.useState<ProductFormData>({
          routineStep: "Cleanse",
          productName: "Test Product",
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
            onCancel={vi.fn()}
            saveLabel="Add"
          />
        );
      }

      render(<FormWrapper />);

      // Day buttons should not be visible for daily frequency
      expect(
        screen.queryByRole("button", { name: /mon/i }),
      ).not.toBeInTheDocument();

      // Click Save button
      await user.click(screen.getByRole("button", { name: /add/i }));

      // No error message should appear
      expect(screen.queryByText(/please select/i)).not.toBeInTheDocument();

      // onSave should be called (validation passes)
      expect(onSave).toHaveBeenCalled();
    });

    it("error state persists across multiple interactions", async () => {
      const user = setupUser();

      function FormWrapper() {
        const [data, setData] = React.useState<ProductFormData>({
          routineStep: "Cleanse",
          productName: "Test Product",
          productUrl: null,
          instructions: "",
          frequency: "2x per week",
          days: undefined,
        });

        return (
          <ProductForm
            data={data}
            onChange={setData}
            onSave={vi.fn()}
            onCancel={vi.fn()}
            saveLabel="Add"
          />
        );
      }

      render(<FormWrapper />);

      // Click Monday to trigger hasInteracted
      await user.click(screen.getByRole("button", { name: /mon/i }));
      expect(
        screen.getByText(/please select exactly 2 days/i),
      ).toBeInTheDocument();

      // Change product name (different field interaction)
      const productNameInput = screen.getByDisplayValue("Test Product");
      await user.clear(productNameInput);
      await user.type(productNameInput, "Updated Product");

      // Error should still be visible (hasInteracted stays true)
      expect(
        screen.getByText(/please select exactly 2 days/i),
      ).toBeInTheDocument();

      // Click Tuesday to fix the error
      await user.click(screen.getByRole("button", { name: /tue/i }));

      // Error should now disappear
      expect(
        screen.queryByText(/please select exactly 2 days/i),
      ).not.toBeInTheDocument();
    });

    it("uses singular 'day' for 1x per week frequency", async () => {
      const user = setupUser();

      function FormWrapper() {
        const [data, setData] = React.useState<ProductFormData>({
          routineStep: "Cleanse",
          productName: "Test Product",
          productUrl: null,
          instructions: "",
          frequency: "1x per week",
          days: undefined,
        });

        return (
          <ProductForm
            data={data}
            onChange={setData}
            onSave={vi.fn()}
            onCancel={vi.fn()}
            saveLabel="Add"
          />
        );
      }

      render(<FormWrapper />);

      // Click Save to trigger error
      await user.click(screen.getByRole("button", { name: /add/i }));

      // Error should use singular "day" not "days"
      expect(
        screen.getByText(/please select exactly 1 day$/i),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/please select exactly 1 days/i),
      ).not.toBeInTheDocument();
    });

    it("uses plural 'days' for 2x+ per week frequencies", async () => {
      const user = setupUser();

      function FormWrapper() {
        const [data, setData] = React.useState<ProductFormData>({
          routineStep: "Cleanse",
          productName: "Test Product",
          productUrl: null,
          instructions: "",
          frequency: "5x per week",
          days: undefined,
        });

        return (
          <ProductForm
            data={data}
            onChange={setData}
            onSave={vi.fn()}
            onCancel={vi.fn()}
            saveLabel="Add"
          />
        );
      }

      render(<FormWrapper />);

      // Click Save to trigger error
      await user.click(screen.getByRole("button", { name: /add/i }));

      // Error should use plural "days"
      expect(
        screen.getByText(/please select exactly 5 days$/i),
      ).toBeInTheDocument();
    });
  });
});

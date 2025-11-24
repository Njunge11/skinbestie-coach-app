import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/utils";
import userEvent from "@testing-library/user-event";
import React from "react";
import { ProductList } from "./product-list";
import type { Product } from "./product-item";

describe("ProductList", () => {
  it("user adds first product to empty list", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    const onUpdate = vi.fn();
    const onDelete = vi.fn();
    const onReorder = vi.fn();

    render(
      <ProductList
        products={[]}
        timeOfDay="morning"
        onAdd={onAdd}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onReorder={onReorder}
      />,
    );

    // User sees empty state
    expect(screen.getByText(/no routine set/i)).toBeInTheDocument();

    // User sees "Add Step" button
    const addButton = screen.getByRole("button", { name: /add step/i });
    expect(addButton).toBeInTheDocument();

    // User clicks Add Step
    await user.click(addButton);

    // Product form should appear
    expect(screen.getByPlaceholderText(/product name/i)).toBeInTheDocument();

    // User fills in the form
    const routineStepButton = screen.getByText(/select routine step/i);
    await user.click(routineStepButton);
    await user.click(screen.getByRole("option", { name: /cleanse/i }));

    const nameInput = screen.getByPlaceholderText(/product name/i);
    await user.type(nameInput, "CeraVe Cleanser");

    const instructionsInput = screen.getByLabelText(/^instructions.*$/i);
    await user.type(instructionsInput, "Apply to damp skin");

    // User clicks Add button
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    // onAdd should be called with the form data
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        routineStep: "Cleanse",
        productName: "CeraVe Cleanser",
        instructions: "Apply to damp skin",
        frequency: "daily",
      }),
    );
  });

  it("user adds second product to existing list", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    const onUpdate = vi.fn();
    const onDelete = vi.fn();
    const onReorder = vi.fn();

    const existingProducts: Product[] = [
      {
        id: "product-1",
        routineStep: "Cleanse",
        productName: "CeraVe Cleanser",
        productUrl: null,
        instructions: "Apply to damp skin",
        frequency: "daily",
        days: null,
        timeOfDay: "morning",
        order: 0,
      },
    ];

    render(
      <ProductList
        products={existingProducts}
        timeOfDay="morning"
        onAdd={onAdd}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onReorder={onReorder}
      />,
    );

    // User sees existing product
    expect(screen.getByText("CeraVe Cleanser")).toBeInTheDocument();

    // User sees "Add Another Step" button
    const addButton = screen.getByRole("button", { name: /add another step/i });
    expect(addButton).toBeInTheDocument();

    // User clicks Add Another Step
    await user.click(addButton);

    // Product form should appear
    expect(screen.getByPlaceholderText(/product name/i)).toBeInTheDocument();

    // User fills in the form for the second product
    const routineStepButton = screen.getByText(/select routine step/i);
    await user.click(routineStepButton);
    await user.click(screen.getByRole("option", { name: "Eye cream" }));

    const nameInput = screen.getByPlaceholderText(/product name/i);
    await user.type(nameInput, "Retinol Eye Cream");

    const instructionsInput = screen.getByLabelText(/^instructions.*$/i);
    await user.type(instructionsInput, "Apply around eyes");

    // User clicks Add button
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    // onAdd should be called with the new product data
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        routineStep: "Eye cream",
        productName: "Retinol Eye Cream",
        instructions: "Apply around eyes",
        frequency: "daily",
      }),
    );
  });

  it("user cancels adding product and form disappears", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    const onUpdate = vi.fn();
    const onDelete = vi.fn();
    const onReorder = vi.fn();

    render(
      <ProductList
        products={[]}
        timeOfDay="morning"
        onAdd={onAdd}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onReorder={onReorder}
      />,
    );

    // User clicks Add Step
    await user.click(screen.getByRole("button", { name: /add step/i }));

    // Product form should appear
    expect(screen.getByPlaceholderText(/product name/i)).toBeInTheDocument();

    // User clicks Cancel
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    // Form should disappear
    expect(
      screen.queryByPlaceholderText(/product name/i),
    ).not.toBeInTheDocument();

    // Add Step button should be visible again
    expect(
      screen.getByRole("button", { name: /add step/i }),
    ).toBeInTheDocument();

    // onAdd should not have been called
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("user sees morning section with sun icon", () => {
    const onAdd = vi.fn();
    const onUpdate = vi.fn();
    const onDelete = vi.fn();
    const onReorder = vi.fn();

    render(
      <ProductList
        products={[]}
        timeOfDay="morning"
        onAdd={onAdd}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onReorder={onReorder}
      />,
    );

    // User sees "Morning" label
    expect(screen.getByText("Morning")).toBeInTheDocument();

    // User sees sun emoji
    expect(screen.getByText("☀️")).toBeInTheDocument();
  });

  it("user sees evening section with moon icon", () => {
    const onAdd = vi.fn();
    const onUpdate = vi.fn();
    const onDelete = vi.fn();
    const onReorder = vi.fn();

    render(
      <ProductList
        products={[]}
        timeOfDay="evening"
        onAdd={onAdd}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onReorder={onReorder}
      />,
    );

    // User sees "Evening" label
    expect(screen.getByText("Evening")).toBeInTheDocument();

    // User sees moon emoji
    expect(screen.getByText("🌙")).toBeInTheDocument();
  });
});

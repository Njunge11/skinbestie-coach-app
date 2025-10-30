import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/utils";
import userEvent from "@testing-library/user-event";
import React from "react";
import { ProductItem, Product } from "./product-item";

describe("ProductItem", () => {
  it("user views product with all details", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    const product: Product = {
      id: "product-1",
      routineStep: "Cleanser",
      productName: "CeraVe Hydrating Cleanser",
      productUrl: "https://example.com/product",
      instructions: "Apply to damp skin, massage gently",
      frequency: "2x per week",
      days: ["Mon", "Fri"],
      timeOfDay: "morning",
      order: 0,
    };

    render(
      <ProductItem
        product={product}
        index={0}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    // User sees routine step badge
    expect(screen.getByText("Cleanser")).toBeInTheDocument();

    // User sees frequency badge with days
    expect(screen.getByText(/2x per week/i)).toBeInTheDocument();
    expect(screen.getByText(/mon, fri/i)).toBeInTheDocument();

    // User sees product name
    expect(screen.getByText("CeraVe Hydrating Cleanser")).toBeInTheDocument();

    // User sees instructions
    expect(
      screen.getByText("Apply to damp skin, massage gently"),
    ).toBeInTheDocument();

    // User sees step number
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("user views product with URL as clickable link", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    const product: Product = {
      id: "product-1",
      routineStep: "Serum",
      productName: "Vitamin C Serum",
      productUrl: "https://example.com/serum",
      instructions: "Apply in the morning",
      frequency: "daily",
      days: null,
      timeOfDay: "morning",
      order: 0,
    };

    render(
      <ProductItem
        product={product}
        index={0}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    // User sees product name as a link
    const productLink = screen.getByRole("link", { name: "Vitamin C Serum" });
    expect(productLink).toBeInTheDocument();
    expect(productLink).toHaveAttribute("href", "https://example.com/serum");
    expect(productLink).toHaveAttribute("target", "_blank");
    expect(productLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("user views product without URL as plain text", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    const product: Product = {
      id: "product-1",
      routineStep: "Moisturizer",
      productName: "Simple Face Cream",
      productUrl: null,
      instructions: "Apply after serum",
      frequency: "daily",
      days: null,
      timeOfDay: "morning",
      order: 0,
    };

    render(
      <ProductItem
        product={product}
        index={0}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    // User sees product name as plain text (not a link)
    expect(screen.getByText("Simple Face Cream")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Simple Face Cream" }),
    ).not.toBeInTheDocument();
  });

  it("user clicks to edit product and sees edit form", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    const product: Product = {
      id: "product-1",
      routineStep: "Toner",
      productName: "Hydrating Toner",
      productUrl: "https://example.com/toner",
      instructions: "Apply with cotton pad",
      frequency: "daily",
      days: null,
      timeOfDay: "morning",
      order: 0,
    };

    render(
      <ProductItem
        product={product}
        index={0}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    // User clicks on the product to edit it (click on instructions, not the link)
    await user.click(screen.getByText("Apply with cotton pad"));

    // Edit form should now be visible
    // User should see the product name input pre-filled
    expect(screen.getByPlaceholderText(/product name/i)).toHaveValue(
      "Hydrating Toner",
    );

    // User should see Save button instead of Add
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();

    // User should see Cancel button
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("user saves edited product and returns to view mode", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    const product: Product = {
      id: "product-1",
      routineStep: "Moisturizer",
      productName: "Simple Moisturizer",
      productUrl: null,
      instructions: "Apply to face",
      frequency: "daily",
      days: null,
      timeOfDay: "morning",
      order: 0,
    };

    render(
      <ProductItem
        product={product}
        index={0}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    // User clicks on the product to edit it
    await user.click(screen.getByText("Apply to face"));

    // Edit form should be visible
    expect(screen.getByPlaceholderText(/product name/i)).toBeInTheDocument();

    // User changes the product name
    const nameInput = screen.getByPlaceholderText(/product name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Moisturizer");

    // User changes the instructions
    const instructionsInput = screen.getByLabelText(/^instructions$/i);
    await user.clear(instructionsInput);
    await user.type(instructionsInput, "Apply twice daily");

    // User clicks Save
    await user.click(screen.getByRole("button", { name: /save/i }));

    // onEdit should be called with the updated data
    expect(onEdit).toHaveBeenCalledWith(
      "product-1",
      expect.objectContaining({
        productName: "Updated Moisturizer",
        instructions: "Apply twice daily",
      }),
    );
  });
});

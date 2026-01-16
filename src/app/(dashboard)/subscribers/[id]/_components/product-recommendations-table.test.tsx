import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/utils";
import { ProductRecommendationsTable } from "./product-recommendations-table";
import { makeRoutineProduct } from "@/test/factories";

describe("ProductRecommendationsTable", () => {
  it("shows empty state when no products exist", () => {
    render(<ProductRecommendationsTable products={[]} />);

    // User sees the empty state icon
    expect(screen.getByText("Product Recommendations")).toBeInTheDocument();

    // User sees empty state heading
    expect(
      screen.getByText("No product recommendations yet"),
    ).toBeInTheDocument();

    // User sees empty state description
    expect(
      screen.getByText(
        /product recommendations will appear here once you add products to the routine above/i,
      ),
    ).toBeInTheDocument();

    // User does not see the table
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows table with products when products exist", () => {
    const products = [
      makeRoutineProduct({
        id: "1",
        stepType: "product",
        routineStep: "Cleanse",
        productName: "CeraVe Hydrating Cleanser",
        productUrl: "https://example.com/product",
        productPurchaseInstructions: "Buy from pharmacy",
        timeOfDay: "morning",
        order: 0,
      }),
      makeRoutineProduct({
        id: "2",
        stepType: "product",
        routineStep: "Moisturise",
        productName: "Simple Moisturizer",
        productUrl: null,
        productPurchaseInstructions: null,
        timeOfDay: "morning",
        order: 1,
      }),
    ];

    render(<ProductRecommendationsTable products={products} />);

    // User sees the table
    expect(screen.getByRole("table")).toBeInTheDocument();

    // User sees column headers
    expect(screen.getByText("Product")).toBeInTheDocument();
    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Store Link")).toBeInTheDocument();
    expect(screen.getByText("Purchase Instructions")).toBeInTheDocument();

    // User sees product data
    expect(screen.getByText("CeraVe Hydrating Cleanser")).toBeInTheDocument();
    expect(screen.getByText("Cleanse")).toBeInTheDocument();
    expect(screen.getByText("View Product")).toBeInTheDocument();
    expect(screen.getByText("Buy from pharmacy")).toBeInTheDocument();

    // User sees second product with default values
    expect(screen.getByText("Simple Moisturizer")).toBeInTheDocument();
    expect(screen.getByText("Moisturise")).toBeInTheDocument();
    expect(screen.getByText("No link")).toBeInTheDocument();
    expect(screen.getByText("No Special Instructions")).toBeInTheDocument();
  });

  it("deduplicates products with same name", () => {
    const products = [
      makeRoutineProduct({
        id: "1",
        stepType: "product",
        routineStep: "Cleanse",
        productName: "CeraVe Hydrating Cleanser",
        productUrl: "https://example.com/product",
        productPurchaseInstructions: "Buy from pharmacy",
        timeOfDay: "morning",
        order: 0,
      }),
      makeRoutineProduct({
        id: "2",
        stepType: "product",
        routineStep: "Cleanse",
        productName: "CeraVe Hydrating Cleanser",
        productUrl: "https://example.com/product",
        productPurchaseInstructions: "Buy from pharmacy",
        timeOfDay: "evening",
        order: 0,
      }),
    ];

    render(<ProductRecommendationsTable products={products} />);

    // User sees only one instance of the product
    const productCells = screen.getAllByText("CeraVe Hydrating Cleanser");
    expect(productCells).toHaveLength(1);
  });
});

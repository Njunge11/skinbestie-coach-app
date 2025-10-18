import { describe, it, expect } from "vitest";
import {
  createTemplateProduct,
  updateTemplateProduct,
  deleteTemplateProduct,
  reorderTemplateProducts,
  type TemplateDeps,
  type CreateTemplateProductInput,
  type UpdateTemplateProductInput,
} from "./actions";
import { makeTemplateRepoFake } from "./template.repo.fake";

// Fixed test data (follows TESTING.md)
const templateId = "550e8400-e29b-41d4-a716-446655440001";
const productId = "550e8400-e29b-41d4-a716-446655440002";
const adminId = "550e8400-e29b-41d4-a716-446655440000";
const mockNow = new Date("2025-01-15T10:00:00Z");

describe("Template Product Actions - Unit Tests", () => {
  // ========================================
  // createTemplateProduct Tests
  // ========================================
  describe("createTemplateProduct", () => {
    it("successfully creates morning product", async () => {
      const repo = makeTemplateRepoFake();

      // Template must exist
      repo._templateStore.set(templateId, {
        id: templateId,
        name: "Test Template",
        description: null,
        createdBy: adminId,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      const deps: TemplateDeps = { repo, now: () => mockNow };

      const input: CreateTemplateProductInput = {
        routineStep: "Cleanser",
        productName: "CeraVe Foaming Cleanser",
        productUrl: "https://example.com/product",
        instructions: "Use morning and evening",
        frequency: "Daily",
        timeOfDay: "morning",
      };

      const result = await createTemplateProduct(templateId, input, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.templateId).toBe(templateId);
        expect(result.data.routineStep).toBe("Cleanser");
        expect(result.data.productName).toBe("CeraVe Foaming Cleanser");
        expect(result.data.productUrl).toBe("https://example.com/product");
        expect(result.data.instructions).toBe("Use morning and evening");
        expect(result.data.frequency).toBe("Daily");
        expect(result.data.days).toBe(null);
        expect(result.data.timeOfDay).toBe("morning");
        expect(result.data.order).toBe(0); // First product
        expect(result.data.createdAt).toEqual(mockNow);
        expect(result.data.updatedAt).toEqual(mockNow);
      }
    });

    it("successfully creates product without optional URL", async () => {
      const repo = makeTemplateRepoFake();

      repo._templateStore.set(templateId, {
        id: templateId,
        name: "Test Template",
        description: null,
        createdBy: adminId,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      const deps: TemplateDeps = { repo, now: () => mockNow };

      const input: CreateTemplateProductInput = {
        routineStep: "Moisturizer",
        productName: "Test Moisturizer",
        instructions: "Apply after serum",
        frequency: "Daily",
        timeOfDay: "evening",
      };

      const result = await createTemplateProduct(templateId, input, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.productUrl).toBe(null);
      }
    });

    it("successfully creates product with 2x per week frequency", async () => {
      const repo = makeTemplateRepoFake();

      repo._templateStore.set(templateId, {
        id: templateId,
        name: "Test Template",
        description: null,
        createdBy: adminId,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      const deps: TemplateDeps = { repo, now: () => mockNow };

      const input: CreateTemplateProductInput = {
        routineStep: "Exfoliant",
        productName: "AHA Exfoliant",
        instructions: "Use on clean skin",
        frequency: "2x per week",
        days: ["Mon", "Thu"],
        timeOfDay: "evening",
      };

      const result = await createTemplateProduct(templateId, input, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.frequency).toBe("2x per week");
        expect(result.data.days).toEqual(["Mon", "Thu"]);
      }
    });

    it("automatically assigns correct order for second product", async () => {
      const repo = makeTemplateRepoFake();

      repo._templateStore.set(templateId, {
        id: templateId,
        name: "Test Template",
        description: null,
        createdBy: adminId,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      // Add first product manually
      repo._productStore.set("product_1", {
        id: "product_1",
        templateId: templateId,
        routineStep: "Cleanser",
        productName: "First Product",
        productUrl: null,
        instructions: "First",
        frequency: "Daily",
        days: null,
        timeOfDay: "morning",
        order: 0,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      const deps: TemplateDeps = { repo, now: () => mockNow };

      const input: CreateTemplateProductInput = {
        routineStep: "Toner",
        productName: "Second Product",
        instructions: "Second",
        frequency: "Daily",
        timeOfDay: "morning",
      };

      const result = await createTemplateProduct(templateId, input, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.order).toBe(1); // Second product in morning
      }
    });

    it("assigns order 0 for first evening product when morning products exist", async () => {
      const repo = makeTemplateRepoFake();

      repo._templateStore.set(templateId, {
        id: templateId,
        name: "Test Template",
        description: null,
        createdBy: adminId,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      // Add morning product
      repo._productStore.set("product_1", {
        id: "product_1",
        templateId: templateId,
        routineStep: "Cleanser",
        productName: "Morning Product",
        productUrl: null,
        instructions: "Morning",
        frequency: "Daily",
        days: null,
        timeOfDay: "morning",
        order: 0,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      const deps: TemplateDeps = { repo, now: () => mockNow };

      const input: CreateTemplateProductInput = {
        routineStep: "Moisturizer",
        productName: "Evening Product",
        instructions: "Evening",
        frequency: "Daily",
        timeOfDay: "evening",
      };

      const result = await createTemplateProduct(templateId, input, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.order).toBe(0); // First evening product
      }
    });

    it("trims whitespace from product fields", async () => {
      const repo = makeTemplateRepoFake();

      repo._templateStore.set(templateId, {
        id: templateId,
        name: "Test Template",
        description: null,
        createdBy: adminId,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      const deps: TemplateDeps = { repo, now: () => mockNow };

      const input: CreateTemplateProductInput = {
        routineStep: "  Cleanser  ",
        productName: "  Product Name  ",
        instructions: "  Instructions  ",
        frequency: "Daily",
        timeOfDay: "morning",
      };

      const result = await createTemplateProduct(templateId, input, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.routineStep).toBe("Cleanser");
        expect(result.data.productName).toBe("Product Name");
        expect(result.data.instructions).toBe("Instructions");
      }
    });

    it("rejects empty routine step", async () => {
      const repo = makeTemplateRepoFake();

      repo._templateStore.set(templateId, {
        id: templateId,
        name: "Test Template",
        description: null,
        createdBy: adminId,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      const deps: TemplateDeps = { repo, now: () => mockNow };

      const input: CreateTemplateProductInput = {
        routineStep: "   ",
        productName: "Product",
        instructions: "Instructions",
        frequency: "Daily",
        timeOfDay: "morning",
      };

      const result = await createTemplateProduct(templateId, input, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("validates template ID format", async () => {
      const repo = makeTemplateRepoFake();
      const deps: TemplateDeps = { repo, now: () => mockNow };

      const input: CreateTemplateProductInput = {
        routineStep: "Cleanser",
        productName: "Product",
        instructions: "Instructions",
        frequency: "Daily",
        timeOfDay: "morning",
      };

      const result = await createTemplateProduct("invalid-uuid", input, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when template not found", async () => {
      const repo = makeTemplateRepoFake();
      const deps: TemplateDeps = { repo, now: () => mockNow };

      const input: CreateTemplateProductInput = {
        routineStep: "Cleanser",
        productName: "Product",
        instructions: "Instructions",
        frequency: "Daily",
        timeOfDay: "morning",
      };

      const result = await createTemplateProduct("550e8400-e29b-41d4-a716-999999999999", input, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Template not found");
      }
    });

    it("handles repository errors", async () => {
      const repo = makeTemplateRepoFake();

      repo.findById = async () => {
        throw new Error("Database connection failed");
      };

      const deps: TemplateDeps = { repo, now: () => mockNow };

      const input: CreateTemplateProductInput = {
        routineStep: "Cleanser",
        productName: "Product",
        instructions: "Instructions",
        frequency: "Daily",
        timeOfDay: "morning",
      };

      const result = await createTemplateProduct(templateId, input, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to create template product");
      }
    });
  });

  // ========================================
  // updateTemplateProduct Tests
  // ========================================
  describe("updateTemplateProduct", () => {
    it("successfully updates product name", async () => {
      const repo = makeTemplateRepoFake();

      repo._productStore.set(productId, {
        id: productId,
        templateId: templateId,
        routineStep: "Cleanser",
        productName: "Old Name",
        productUrl: null,
        instructions: "Instructions",
        frequency: "Daily",
        days: null,
        timeOfDay: "morning",
        order: 0,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      const laterTime = new Date("2025-01-15T11:00:00Z");
      const deps: TemplateDeps = { repo, now: () => laterTime };

      const updates: UpdateTemplateProductInput = {
        productName: "New Name",
      };

      const result = await updateTemplateProduct(productId, updates, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.productName).toBe("New Name");
        expect(result.data.updatedAt).toEqual(laterTime);
        expect(result.data.createdAt).toEqual(mockNow);
      }
    });

    it("successfully updates frequency and days", async () => {
      const repo = makeTemplateRepoFake();

      repo._productStore.set(productId, {
        id: productId,
        templateId: templateId,
        routineStep: "Exfoliant",
        productName: "Product",
        productUrl: null,
        instructions: "Instructions",
        frequency: "Daily",
        days: null,
        timeOfDay: "evening",
        order: 0,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      const deps: TemplateDeps = { repo, now: () => mockNow };

      const updates: UpdateTemplateProductInput = {
        frequency: "2x per week",
        days: ["Mon", "Thu"],
      };

      const result = await updateTemplateProduct(productId, updates, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.frequency).toBe("2x per week");
        expect(result.data.days).toEqual(["Mon", "Thu"]);
      }
    });

    it("successfully clears product URL", async () => {
      const repo = makeTemplateRepoFake();

      repo._productStore.set(productId, {
        id: productId,
        templateId: templateId,
        routineStep: "Cleanser",
        productName: "Product",
        productUrl: "https://example.com/old",
        instructions: "Instructions",
        frequency: "Daily",
        days: null,
        timeOfDay: "morning",
        order: 0,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      const deps: TemplateDeps = { repo, now: () => mockNow };

      const updates: UpdateTemplateProductInput = {
        productUrl: null,
      };

      const result = await updateTemplateProduct(productId, updates, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.productUrl).toBe(null);
      }
    });

    it("trims whitespace from updated fields", async () => {
      const repo = makeTemplateRepoFake();

      repo._productStore.set(productId, {
        id: productId,
        templateId: templateId,
        routineStep: "Cleanser",
        productName: "Old Name",
        productUrl: null,
        instructions: "Old Instructions",
        frequency: "Daily",
        days: null,
        timeOfDay: "morning",
        order: 0,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      const deps: TemplateDeps = { repo, now: () => mockNow };

      const updates: UpdateTemplateProductInput = {
        productName: "  Trimmed  ",
        instructions: "  Trimmed Instructions  ",
      };

      const result = await updateTemplateProduct(productId, updates, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.productName).toBe("Trimmed");
        expect(result.data.instructions).toBe("Trimmed Instructions");
      }
    });

    it("returns error when product not found", async () => {
      const repo = makeTemplateRepoFake();
      const deps: TemplateDeps = { repo, now: () => mockNow };

      const updates: UpdateTemplateProductInput = {
        productName: "New Name",
      };

      const result = await updateTemplateProduct("550e8400-e29b-41d4-a716-999999999999", updates, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Template product not found");
      }
    });

    it("validates product ID format", async () => {
      const repo = makeTemplateRepoFake();
      const deps: TemplateDeps = { repo, now: () => mockNow };

      const updates: UpdateTemplateProductInput = {
        productName: "New Name",
      };

      const result = await updateTemplateProduct("invalid-uuid", updates, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("rejects empty product name", async () => {
      const repo = makeTemplateRepoFake();

      repo._productStore.set(productId, {
        id: productId,
        templateId: templateId,
        routineStep: "Cleanser",
        productName: "Old Name",
        productUrl: null,
        instructions: "Instructions",
        frequency: "Daily",
        days: null,
        timeOfDay: "morning",
        order: 0,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      const deps: TemplateDeps = { repo, now: () => mockNow };

      const updates: UpdateTemplateProductInput = {
        productName: "   ",
      };

      const result = await updateTemplateProduct(productId, updates, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("handles repository errors", async () => {
      const repo = makeTemplateRepoFake();

      repo.updateProduct = async () => {
        throw new Error("Database connection failed");
      };

      const deps: TemplateDeps = { repo, now: () => mockNow };

      const updates: UpdateTemplateProductInput = {
        productName: "New Name",
      };

      const result = await updateTemplateProduct(productId, updates, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to update template product");
      }
    });
  });

  // ========================================
  // deleteTemplateProduct Tests
  // ========================================
  describe("deleteTemplateProduct", () => {
    it("successfully deletes product", async () => {
      const repo = makeTemplateRepoFake();

      repo._productStore.set(productId, {
        id: productId,
        templateId: templateId,
        routineStep: "Cleanser",
        productName: "Product to Delete",
        productUrl: null,
        instructions: "Instructions",
        frequency: "Daily",
        days: null,
        timeOfDay: "morning",
        order: 0,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      const deps: TemplateDeps = { repo, now: () => mockNow };

      const result = await deleteTemplateProduct(productId, deps);

      expect(result.success).toBe(true);
      expect(repo._productStore.has(productId)).toBe(false);
    });

    it("returns error when product not found", async () => {
      const repo = makeTemplateRepoFake();
      const deps: TemplateDeps = { repo, now: () => mockNow };

      const result = await deleteTemplateProduct("550e8400-e29b-41d4-a716-999999999999", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Template product not found");
      }
    });

    it("validates product ID format", async () => {
      const repo = makeTemplateRepoFake();
      const deps: TemplateDeps = { repo, now: () => mockNow };

      const result = await deleteTemplateProduct("invalid-uuid", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("handles repository errors", async () => {
      const repo = makeTemplateRepoFake();

      repo.deleteProductById = async () => {
        throw new Error("Database connection failed");
      };

      const deps: TemplateDeps = { repo, now: () => mockNow };

      const result = await deleteTemplateProduct(productId, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to delete template product");
      }
    });
  });

  // ========================================
  // reorderTemplateProducts Tests
  // ========================================
  describe("reorderTemplateProducts", () => {
    it("successfully reorders morning products", async () => {
      const repo = makeTemplateRepoFake();

      const product1Id = "550e8400-e29b-41d4-a716-446655440010";
      const product2Id = "550e8400-e29b-41d4-a716-446655440011";
      const product3Id = "550e8400-e29b-41d4-a716-446655440012";

      // Add 3 morning products
      repo._productStore.set(product1Id, {
        id: product1Id,
        templateId: templateId,
        routineStep: "Step 1",
        productName: "Product 1",
        productUrl: null,
        instructions: "Instructions 1",
        frequency: "Daily",
        days: null,
        timeOfDay: "morning",
        order: 0,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      repo._productStore.set(product2Id, {
        id: product2Id,
        templateId: templateId,
        routineStep: "Step 2",
        productName: "Product 2",
        productUrl: null,
        instructions: "Instructions 2",
        frequency: "Daily",
        days: null,
        timeOfDay: "morning",
        order: 1,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      repo._productStore.set(product3Id, {
        id: product3Id,
        templateId: templateId,
        routineStep: "Step 3",
        productName: "Product 3",
        productUrl: null,
        instructions: "Instructions 3",
        frequency: "Daily",
        days: null,
        timeOfDay: "morning",
        order: 2,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      const deps: TemplateDeps = { repo, now: () => mockNow };

      // Reorder: swap first and last
      const result = await reorderTemplateProducts(
        templateId,
        "morning",
        [product3Id, product2Id, product1Id],
        deps
      );

      expect(result.success).toBe(true);

      // Verify new order
      expect(repo._productStore.get(product3Id)!.order).toBe(0);
      expect(repo._productStore.get(product2Id)!.order).toBe(1);
      expect(repo._productStore.get(product1Id)!.order).toBe(2);
    });

    it("does not affect evening products when reordering morning", async () => {
      const repo = makeTemplateRepoFake();

      const morning1Id = "550e8400-e29b-41d4-a716-446655440020";
      const evening1Id = "550e8400-e29b-41d4-a716-446655440021";

      repo._productStore.set(morning1Id, {
        id: morning1Id,
        templateId: templateId,
        routineStep: "Morning Step",
        productName: "Morning Product",
        productUrl: null,
        instructions: "Morning",
        frequency: "Daily",
        days: null,
        timeOfDay: "morning",
        order: 0,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      repo._productStore.set(evening1Id, {
        id: evening1Id,
        templateId: templateId,
        routineStep: "Evening Step",
        productName: "Evening Product",
        productUrl: null,
        instructions: "Evening",
        frequency: "Daily",
        days: null,
        timeOfDay: "evening",
        order: 0,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      const deps: TemplateDeps = { repo, now: () => mockNow };

      const result = await reorderTemplateProducts(
        templateId,
        "morning",
        [morning1Id],
        deps
      );

      expect(result.success).toBe(true);
      // Evening product should be unchanged
      expect(repo._productStore.get(evening1Id)!.order).toBe(0);
    });

    it("validates template ID format", async () => {
      const repo = makeTemplateRepoFake();
      const deps: TemplateDeps = { repo, now: () => mockNow };

      const result = await reorderTemplateProducts(
        "invalid-uuid",
        "morning",
        ["product_1"],
        deps
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("validates all product IDs are UUIDs", async () => {
      const repo = makeTemplateRepoFake();
      const deps: TemplateDeps = { repo, now: () => mockNow };

      const result = await reorderTemplateProducts(
        templateId,
        "morning",
        ["invalid-uuid", "product_2"],
        deps
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("handles repository errors", async () => {
      const repo = makeTemplateRepoFake();

      repo.updateManyProducts = async () => {
        throw new Error("Database connection failed");
      };

      const deps: TemplateDeps = { repo, now: () => mockNow };

      const validProductId = "550e8400-e29b-41d4-a716-446655440030";

      const result = await reorderTemplateProducts(
        templateId,
        "morning",
        [validProductId],
        deps
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to reorder template products");
      }
    });
  });
});

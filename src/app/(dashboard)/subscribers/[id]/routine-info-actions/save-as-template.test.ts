import { describe, it, expect } from "vitest";
import { saveRoutineAsTemplate } from "./save-as-template";
import { makeRoutineRepoFake } from "./routine.repo.fake";
import { makeTemplateRepoFake } from "@/app/(dashboard)/routine-management/template-actions/template.repo.fake";
import { makeRoutineProductRepoFake } from "../routine-actions/routine-product.repo.fake";

// Fixed test data (follows TESTING.md)
const adminId = "550e8400-e29b-41d4-a716-446655440000";
const userId = "550e8400-e29b-41d4-a716-446655440001";
const routineId = "550e8400-e29b-41d4-a716-446655440002";
const mockNow = new Date("2025-01-15T10:00:00Z");

describe("saveRoutineAsTemplate", () => {
  // ========================================
  // Happy Path
  // ========================================
  it("saveRoutineAsTemplate_withValidPublishedRoutine_createsTemplateAndProducts", async () => {
    // Given: Published routine with 3 products
    const routineRepo = makeRoutineRepoFake();
    const templateRepo = makeTemplateRepoFake();
    const productRepo = makeRoutineProductRepoFake();

    // Setup routine
    routineRepo._routineStore.set(routineId, {
      id: routineId,
      userProfileId: userId,
      name: "Acne Treatment Routine",
      startDate: new Date("2025-01-01"),
      endDate: null,
      status: "published",
      savedAsTemplate: false,
      createdAt: mockNow,
      updatedAt: mockNow,
    });

    // Setup products
    productRepo._productStore.set("product_1", {
      id: "product_1",
      routineId,
      userProfileId: userId,
      stepType: "product",
      stepName: null,
      routineStep: "Cleanse",
      productName: "CeraVe Cleanser",
      productUrl: "https://example.com/cleanser",
      instructions: "Use twice daily",
      frequency: "daily",
      days: null,
      timeOfDay: "morning",
      order: 0,
      productPurchaseInstructions: null,
      createdAt: mockNow,
      updatedAt: mockNow,
    });

    productRepo._productStore.set("product_2", {
      id: "product_2",
      routineId,
      userProfileId: userId,
      stepType: "product",
      stepName: null,
      routineStep: "Moisturize",
      productName: "CeraVe Moisturizer",
      productUrl: null,
      instructions: "Apply after cleansing",
      frequency: "daily",
      days: null,
      timeOfDay: "morning",
      order: 1,
      productPurchaseInstructions: null,
      createdAt: mockNow,
      updatedAt: mockNow,
    });

    productRepo._productStore.set("product_3", {
      id: "product_3",
      routineId,
      userProfileId: userId,
      stepType: "product",
      stepName: null,
      routineStep: "Cleanse",
      productName: "Evening Cleanser",
      productUrl: "https://example.com/evening",
      instructions: "Use before bed",
      frequency: "daily",
      days: null,
      timeOfDay: "evening",
      order: 0,
      productPurchaseInstructions: null,
      createdAt: mockNow,
      updatedAt: mockNow,
    });

    const deps = {
      routineRepo,
      templateRepo,
      productRepo,
      now: () => mockNow,
    };

    // When: Call saveRoutineAsTemplate
    const result = await saveRoutineAsTemplate(routineId, adminId, deps);

    // Then: Success, template created with all products, routine marked as saved
    expect(result.success).toBe(true);

    // Verify routine marked as saved
    const updatedRoutine = routineRepo._routineStore.get(routineId);
    expect(updatedRoutine?.savedAsTemplate).toBe(true);

    // Verify template created with correct name
    const templates = Array.from(templateRepo._templateStore.values());
    expect(templates).toHaveLength(1);
    expect(templates[0].name).toBe("Acne Treatment Routine");
    expect(templates[0].createdBy).toBe(adminId);

    // Verify all 3 products copied to template
    const templateProducts = Array.from(
      templateRepo._productStore.values(),
    ).filter((p) => p.templateId === templates[0].id);
    expect(templateProducts).toHaveLength(3);
  });

  // ========================================
  // Business Rules
  // ========================================
  it("saveRoutineAsTemplate_withDraftRoutine_returnsError", async () => {
    // Given: Draft routine (not published)
    const routineRepo = makeRoutineRepoFake();
    const templateRepo = makeTemplateRepoFake();
    const productRepo = makeRoutineProductRepoFake();

    routineRepo._routineStore.set(routineId, {
      id: routineId,
      userProfileId: userId,
      name: "Draft Routine",
      startDate: new Date("2025-01-01"),
      endDate: null,
      status: "draft", // Not published
      savedAsTemplate: false,
      createdAt: mockNow,
      updatedAt: mockNow,
    });

    const deps = {
      routineRepo,
      templateRepo,
      productRepo,
      now: () => mockNow,
    };

    // When: Call saveRoutineAsTemplate
    const result = await saveRoutineAsTemplate(routineId, adminId, deps);

    // Then: Returns error
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "Only published routines can be saved as templates",
      );
    }

    // Verify no template created
    expect(templateRepo._templateStore.size).toBe(0);
  });

  it("saveRoutineAsTemplate_withAlreadySavedRoutine_returnsError", async () => {
    // Given: Routine already saved as template
    const routineRepo = makeRoutineRepoFake();
    const templateRepo = makeTemplateRepoFake();
    const productRepo = makeRoutineProductRepoFake();

    routineRepo._routineStore.set(routineId, {
      id: routineId,
      userProfileId: userId,
      name: "Already Saved Routine",
      startDate: new Date("2025-01-01"),
      endDate: null,
      status: "published",
      savedAsTemplate: true, // Already saved
      createdAt: mockNow,
      updatedAt: mockNow,
    });

    const deps = {
      routineRepo,
      templateRepo,
      productRepo,
      now: () => mockNow,
    };

    // When: Call saveRoutineAsTemplate
    const result = await saveRoutineAsTemplate(routineId, adminId, deps);

    // Then: Returns error
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "This routine has already been saved as a template",
      );
    }

    // Verify no template created
    expect(templateRepo._templateStore.size).toBe(0);
  });

  it("saveRoutineAsTemplate_withNoProducts_returnsError", async () => {
    // Given: Published routine with 0 products
    const routineRepo = makeRoutineRepoFake();
    const templateRepo = makeTemplateRepoFake();
    const productRepo = makeRoutineProductRepoFake();

    routineRepo._routineStore.set(routineId, {
      id: routineId,
      userProfileId: userId,
      name: "Empty Routine",
      startDate: new Date("2025-01-01"),
      endDate: null,
      status: "published",
      savedAsTemplate: false,
      createdAt: mockNow,
      updatedAt: mockNow,
    });

    // No products added

    const deps = {
      routineRepo,
      templateRepo,
      productRepo,
      now: () => mockNow,
    };

    // When: Call saveRoutineAsTemplate
    const result = await saveRoutineAsTemplate(routineId, adminId, deps);

    // Then: Returns error
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "Cannot save routine with no products as template",
      );
    }

    // Verify no template created
    expect(templateRepo._templateStore.size).toBe(0);
  });

  // ========================================
  // Validation & Edge Cases
  // ========================================
  it("saveRoutineAsTemplate_withNonExistentRoutine_returnsError", async () => {
    // Given: Non-existent routine ID
    const routineRepo = makeRoutineRepoFake();
    const templateRepo = makeTemplateRepoFake();
    const productRepo = makeRoutineProductRepoFake();

    const deps = {
      routineRepo,
      templateRepo,
      productRepo,
      now: () => mockNow,
    };

    // When: Call with non-existent ID
    const result = await saveRoutineAsTemplate(
      "550e8400-e29b-41d4-a716-999999999999",
      adminId,
      deps,
    );

    // Then: Returns error
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Routine not found");
    }
  });

  it("saveRoutineAsTemplate_withInvalidUUID_returnsError", async () => {
    // Given: Invalid UUID format
    const routineRepo = makeRoutineRepoFake();
    const templateRepo = makeTemplateRepoFake();
    const productRepo = makeRoutineProductRepoFake();

    const deps = {
      routineRepo,
      templateRepo,
      productRepo,
      now: () => mockNow,
    };

    // When: Call with invalid UUID
    const result = await saveRoutineAsTemplate("invalid-uuid", adminId, deps);

    // Then: Returns validation error
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Invalid data");
    }
  });

  // ========================================
  // Data Integrity
  // ========================================
  it("saveRoutineAsTemplate_copiesAllProductFields_correctly", async () => {
    // Given: Routine with product having all fields populated
    const routineRepo = makeRoutineRepoFake();
    const templateRepo = makeTemplateRepoFake();
    const productRepo = makeRoutineProductRepoFake();

    routineRepo._routineStore.set(routineId, {
      id: routineId,
      userProfileId: userId,
      name: "Test Routine",
      startDate: new Date("2025-01-01"),
      endDate: null,
      status: "published",
      savedAsTemplate: false,
      createdAt: mockNow,
      updatedAt: mockNow,
    });

    productRepo._productStore.set("product_1", {
      id: "product_1",
      routineId,
      userProfileId: userId,
      stepType: "product",
      stepName: null,
      routineStep: "Treatment",
      productName: "Tretinoin 0.05%",
      productUrl: "https://example.com/tretinoin",
      instructions: "Apply pea-sized amount",
      frequency: "specific_days",
      days: ["Monday", "Wednesday", "Friday"],
      timeOfDay: "evening",
      order: 0,
      productPurchaseInstructions: null,
      createdAt: mockNow,
      updatedAt: mockNow,
    });

    const deps = {
      routineRepo,
      templateRepo,
      productRepo,
      now: () => mockNow,
    };

    // When: Save as template
    const result = await saveRoutineAsTemplate(routineId, adminId, deps);

    // Then: All fields copied correctly
    expect(result.success).toBe(true);

    const templates = Array.from(templateRepo._templateStore.values());
    const templateProducts = Array.from(
      templateRepo._productStore.values(),
    ).filter((p) => p.templateId === templates[0].id);

    expect(templateProducts).toHaveLength(1);
    const copiedProduct = templateProducts[0];

    expect(copiedProduct.routineStep).toBe("Treatment");
    expect(copiedProduct.productName).toBe("Tretinoin 0.05%");
    expect(copiedProduct.productUrl).toBe("https://example.com/tretinoin");
    expect(copiedProduct.instructions).toBe("Apply pea-sized amount");
    expect(copiedProduct.frequency).toBe("specific_days");
    expect(copiedProduct.days).toEqual(["Monday", "Wednesday", "Friday"]);
    expect(copiedProduct.timeOfDay).toBe("evening");
    expect(copiedProduct.order).toBe(0);
  });

  it("saveRoutineAsTemplate_preservesProductOrder_byTimeOfDay", async () => {
    // Given: Routine with products in specific order
    const routineRepo = makeRoutineRepoFake();
    const templateRepo = makeTemplateRepoFake();
    const productRepo = makeRoutineProductRepoFake();

    routineRepo._routineStore.set(routineId, {
      id: routineId,
      userProfileId: userId,
      name: "Ordered Routine",
      startDate: new Date("2025-01-01"),
      endDate: null,
      status: "published",
      savedAsTemplate: false,
      createdAt: mockNow,
      updatedAt: mockNow,
    });

    // Morning products: order 0, 1
    productRepo._productStore.set("morning_1", {
      id: "morning_1",
      routineId,
      userProfileId: userId,
      stepType: "product",
      stepName: null,
      routineStep: "Cleanse",
      productName: "Morning Cleanser",
      productUrl: null,
      instructions: "First step",
      frequency: "daily",
      days: null,
      timeOfDay: "morning",
      order: 0,
      productPurchaseInstructions: null,
      createdAt: mockNow,
      updatedAt: mockNow,
    });

    productRepo._productStore.set("morning_2", {
      id: "morning_2",
      routineId,
      userProfileId: userId,
      stepType: "product",
      stepName: null,
      routineStep: "Moisturize",
      productName: "Morning Moisturizer",
      productUrl: null,
      instructions: "Second step",
      frequency: "daily",
      days: null,
      timeOfDay: "morning",
      order: 1,
      productPurchaseInstructions: null,
      createdAt: mockNow,
      updatedAt: mockNow,
    });

    // Evening products: order 0, 1
    productRepo._productStore.set("evening_1", {
      id: "evening_1",
      routineId,
      userProfileId: userId,
      stepType: "product",
      stepName: null,
      routineStep: "Cleanse",
      productName: "Evening Cleanser",
      productUrl: null,
      instructions: "First step",
      frequency: "daily",
      days: null,
      timeOfDay: "evening",
      order: 0,
      productPurchaseInstructions: null,
      createdAt: mockNow,
      updatedAt: mockNow,
    });

    productRepo._productStore.set("evening_2", {
      id: "evening_2",
      routineId,
      userProfileId: userId,
      stepType: "product",
      stepName: null,
      routineStep: "Treatment",
      productName: "Night Treatment",
      productUrl: null,
      instructions: "Second step",
      frequency: "daily",
      days: null,
      timeOfDay: "evening",
      order: 1,
      productPurchaseInstructions: null,
      createdAt: mockNow,
      updatedAt: mockNow,
    });

    const deps = {
      routineRepo,
      templateRepo,
      productRepo,
      now: () => mockNow,
    };

    // When: Save as template
    const result = await saveRoutineAsTemplate(routineId, adminId, deps);

    // Then: Order preserved per timeOfDay
    expect(result.success).toBe(true);

    const templates = Array.from(templateRepo._templateStore.values());
    const templateProducts = Array.from(
      templateRepo._productStore.values(),
    ).filter((p) => p.templateId === templates[0].id);

    const morningProducts = templateProducts
      .filter((p) => p.timeOfDay === "morning")
      .sort((a, b) => a.order - b.order);
    const eveningProducts = templateProducts
      .filter((p) => p.timeOfDay === "evening")
      .sort((a, b) => a.order - b.order);

    expect(morningProducts).toHaveLength(2);
    expect(morningProducts[0].productName).toBe("Morning Cleanser");
    expect(morningProducts[0].order).toBe(0);
    expect(morningProducts[1].productName).toBe("Morning Moisturizer");
    expect(morningProducts[1].order).toBe(1);

    expect(eveningProducts).toHaveLength(2);
    expect(eveningProducts[0].productName).toBe("Evening Cleanser");
    expect(eveningProducts[0].order).toBe(0);
    expect(eveningProducts[1].productName).toBe("Night Treatment");
    expect(eveningProducts[1].order).toBe(1);
  });
});

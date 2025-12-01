import { describe, it, expect, beforeEach } from "vitest";
import {
  copyTemplateToUser,
  type CopyTemplateDeps,
  type CopyTemplateInput,
} from "./copy-template";
import { makeTemplateRepoFake } from "./template.repo.fake";
import { makeRoutineRepoFake } from "@/app/(dashboard)/subscribers/[id]/routine-info-actions/routine.repo.fake";

// Fixed test data (follows TESTING.md)
const templateId = "850e8400-e29b-41d4-a716-446655440001";
const userId = "550e8400-e29b-41d4-a716-446655440000";
const adminId = "650e8400-e29b-41d4-a716-446655440000";
const mockNow = new Date("2025-02-01T10:00:00Z");

describe("copyTemplateToUser - Unit Tests", () => {
  let templateRepo: ReturnType<typeof makeTemplateRepoFake>;
  let routineRepo: ReturnType<typeof makeRoutineRepoFake>;
  let deps: CopyTemplateDeps;

  beforeEach(() => {
    templateRepo = makeTemplateRepoFake();
    routineRepo = makeRoutineRepoFake();

    deps = {
      templateRepo,
      routineRepo,
      now: () => mockNow,
    };
  });

  // ========================================
  // Happy Path - Field Preservation
  // ========================================
  describe("Field Preservation", () => {
    it("preserves stepType='instruction_only' when copying template products", async () => {
      // GIVEN: Template with mixed step types
      templateRepo._templateStore.set(templateId, {
        id: templateId,
        name: "Test Template",
        description: "Has instruction steps",
        createdBy: adminId,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      templateRepo._productStore.set("product-1", {
        id: "product-1",
        templateId: templateId,
        stepType: "product",
        stepName: null,
        routineStep: "cleanse",
        productName: "Gentle Cleanser",
        productUrl: "https://example.com/cleanser",
        instructions: "Apply to damp skin",
        productPurchaseInstructions: null,
        frequency: "daily",
        days: null,
        timeOfDay: "morning",
        order: 0,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      templateRepo._productStore.set("instruction-1", {
        id: "instruction-1",
        templateId: templateId,
        stepType: "instruction_only",
        stepName: "Wait Time",
        routineStep: null,
        productName: null,
        productUrl: null,
        instructions: "Wait 5 minutes before applying next product",
        productPurchaseInstructions: null,
        frequency: "daily",
        days: null,
        timeOfDay: "morning",
        order: 1,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      templateRepo._productStore.set("product-2", {
        id: "product-2",
        templateId: templateId,
        stepType: "product",
        stepName: null,
        routineStep: "moisturize",
        productName: "Hydrating Moisturizer",
        productUrl: null,
        instructions: "Apply liberally",
        productPurchaseInstructions: "Available at local pharmacy",
        frequency: "daily",
        days: null,
        timeOfDay: "morning",
        order: 2,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      const input: CopyTemplateInput = {
        name: "My New Routine",
        startDate: new Date("2025-02-01"),
        endDate: new Date("2025-04-01"),
      };

      // WHEN: Copying template to user
      const result = await copyTemplateToUser(templateId, userId, input, deps);

      // THEN: Success
      expect(result.success).toBe(true);
      if (!result.success) return;

      // Verify routine was created
      expect(result.data.routine.name).toBe("My New Routine");
      expect(result.data.routine.status).toBe("draft");

      // Verify all products were copied
      expect(result.data.products).toHaveLength(3);

      // CRITICAL: Verify stepType is preserved
      const products = result.data.products;

      // First product: regular product step
      expect(products[0].stepType).toBe("product");
      expect(products[0].routineStep).toBe("cleanse");
      expect(products[0].productName).toBe("Gentle Cleanser");
      expect(products[0].stepName).toBeNull();

      // THIS IS THE KEY TEST: instruction_only step should remain instruction_only
      expect(products[1].stepType).toBe("instruction_only");
      expect(products[1].stepName).toBe("Wait Time");
      expect(products[1].instructions).toBe(
        "Wait 5 minutes before applying next product",
      );
      expect(products[1].routineStep).toBeNull();
      expect(products[1].productName).toBeNull();

      // Third product: verify productPurchaseInstructions is preserved
      expect(products[2].stepType).toBe("product");
      expect(products[2].productPurchaseInstructions).toBe(
        "Available at local pharmacy",
      );
    });

    it("preserves stepName for instruction_only steps", async () => {
      // GIVEN: Template with instruction step
      templateRepo._templateStore.set(templateId, {
        id: templateId,
        name: "Template with Instructions",
        description: null,
        createdBy: adminId,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      templateRepo._productStore.set("instruction-1", {
        id: "instruction-1",
        templateId: templateId,
        stepType: "instruction_only",
        stepName: "Important Waiting Period",
        routineStep: null,
        productName: null,
        productUrl: null,
        instructions: "Wait for product to fully absorb",
        productPurchaseInstructions: null,
        frequency: "daily",
        days: null,
        timeOfDay: "evening",
        order: 0,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      const input: CopyTemplateInput = {
        name: "Evening Routine",
        startDate: new Date("2025-03-01"),
        endDate: null,
      };

      // WHEN: Copying
      const result = await copyTemplateToUser(templateId, userId, input, deps);

      // THEN: stepName is preserved
      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.products[0].stepType).toBe("instruction_only");
      expect(result.data.products[0].stepName).toBe("Important Waiting Period");
    });

    it("preserves productPurchaseInstructions when copying", async () => {
      // GIVEN: Template with purchase instructions
      templateRepo._templateStore.set(templateId, {
        id: templateId,
        name: "Brightening Routine",
        description: null,
        createdBy: adminId,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      templateRepo._productStore.set("product-1", {
        id: "product-1",
        templateId: templateId,
        stepType: "product",
        stepName: null,
        routineStep: "serum",
        productName: "Vitamin C Serum",
        productUrl: null,
        instructions: "Apply in the morning",
        productPurchaseInstructions: "Available at Sephora or Ulta",
        frequency: "daily",
        days: null,
        timeOfDay: "morning",
        order: 0,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      const input: CopyTemplateInput = {
        name: "Brightening Routine",
        startDate: new Date("2025-03-01"),
        endDate: null,
      };

      // WHEN: Copying
      const result = await copyTemplateToUser(templateId, userId, input, deps);

      // THEN: productPurchaseInstructions is preserved
      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.products[0].productPurchaseInstructions).toBe(
        "Available at Sephora or Ulta",
      );
    });
  });

  // ========================================
  // Business Rules
  // ========================================
  describe("Business Rules", () => {
    it("returns error when template not found", async () => {
      const input: CopyTemplateInput = {
        name: "Test Routine",
        startDate: new Date("2025-02-01"),
        endDate: null,
      };

      const result = await copyTemplateToUser(
        "850e8400-e29b-41d4-a716-999999999999",
        userId,
        input,
        deps,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Template not found");
      }
    });

    it("returns error when user already has a routine", async () => {
      // Setup template
      templateRepo._templateStore.set(templateId, {
        id: templateId,
        name: "Test Template",
        description: null,
        createdBy: adminId,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      // Setup existing routine for user
      routineRepo._routineStore.set("existing-routine", {
        id: "existing-routine",
        userProfileId: userId,
        name: "Existing Routine",
        startDate: new Date("2025-01-01"),
        endDate: null,
        status: "published",
        savedAsTemplate: false,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      const input: CopyTemplateInput = {
        name: "New Routine",
        startDate: new Date("2025-02-01"),
        endDate: null,
      };

      const result = await copyTemplateToUser(templateId, userId, input, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("User already has a routine");
      }
    });

    it("creates routine without end date when endDate is null", async () => {
      // Setup template
      templateRepo._templateStore.set(templateId, {
        id: templateId,
        name: "Test Template",
        description: null,
        createdBy: adminId,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      templateRepo._productStore.set("product-1", {
        id: "product-1",
        templateId: templateId,
        stepType: "product",
        stepName: null,
        routineStep: "cleanse",
        productName: "Cleanser",
        productUrl: null,
        instructions: "Apply to skin",
        productPurchaseInstructions: null,
        frequency: "daily",
        days: null,
        timeOfDay: "morning",
        order: 0,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      const input: CopyTemplateInput = {
        name: "Ongoing Routine",
        startDate: new Date("2025-02-01"),
        endDate: null,
      };

      const result = await copyTemplateToUser(templateId, userId, input, deps);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.routine.endDate).toBeNull();
    });
  });

  // ========================================
  // Validation
  // ========================================
  describe("Validation", () => {
    it("returns error when templateId is invalid UUID", async () => {
      const input: CopyTemplateInput = {
        name: "Test Routine",
        startDate: new Date("2025-02-01"),
        endDate: null,
      };

      const result = await copyTemplateToUser(
        "not-a-uuid",
        userId,
        input,
        deps,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when userId is invalid UUID", async () => {
      const input: CopyTemplateInput = {
        name: "Test Routine",
        startDate: new Date("2025-02-01"),
        endDate: null,
      };

      const result = await copyTemplateToUser(
        templateId,
        "not-a-uuid",
        input,
        deps,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when routine name is empty", async () => {
      const input: CopyTemplateInput = {
        name: "",
        startDate: new Date("2025-02-01"),
        endDate: null,
      };

      const result = await copyTemplateToUser(templateId, userId, input, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when routine name is whitespace only", async () => {
      const input: CopyTemplateInput = {
        name: "   ",
        startDate: new Date("2025-02-01"),
        endDate: null,
      };

      const result = await copyTemplateToUser(templateId, userId, input, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });
  });

  // ========================================
  // Error Handling
  // ========================================
  describe("Error Handling", () => {
    it("handles repository errors when creating routine", async () => {
      // Setup template
      templateRepo._templateStore.set(templateId, {
        id: templateId,
        name: "Test Template",
        description: null,
        createdBy: adminId,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      // Mock repo to throw error
      routineRepo.createRoutineFromTemplate = async () => {
        throw new Error("Database connection failed");
      };

      const input: CopyTemplateInput = {
        name: "Test Routine",
        startDate: new Date("2025-02-01"),
        endDate: null,
      };

      const result = await copyTemplateToUser(templateId, userId, input, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to copy template");
      }
    });
  });
});

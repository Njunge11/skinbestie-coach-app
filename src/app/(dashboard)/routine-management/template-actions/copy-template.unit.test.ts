import { describe, it, expect } from "vitest";
import {
  copyTemplateToUser,
  type CopyTemplateDeps,
  type CopyTemplateInput,
} from "./copy-template";
import { makeTemplateRepoFake } from "./template.repo.fake";
import { makeRoutineRepoFake } from "@/app/(dashboard)/subscribers/[id]/routine-info-actions/routine.repo.fake";

// Fixed test data (follows TESTING.md)
const adminId = "550e8400-e29b-41d4-a716-446655440000";
const templateId = "550e8400-e29b-41d4-a716-446655440001";
const userId = "550e8400-e29b-41d4-a716-446655440010";
const mockNow = new Date("2025-01-15T10:00:00Z");

describe("Copy Template to User - Unit Tests", () => {
  describe("copyTemplateToUser", () => {
    it("successfully copies template with all products to user", async () => {
      const templateRepo = makeTemplateRepoFake();
      const routineRepo = makeRoutineRepoFake();

      // Setup: Create template with products
      templateRepo._templateStore.set(templateId, {
        id: templateId,
        name: "Acne Treatment Template",
        description: "For acne-prone skin",
        createdBy: adminId,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      templateRepo._productStore.set("product_1", {
        id: "product_1",
        templateId: templateId,
        routineStep: "Cleanser",
        productName: "CeraVe Foaming Cleanser",
        productUrl: "https://example.com/product1",
        instructions: "Use morning and evening",
        frequency: "Daily",
        days: null,
        timeOfDay: "morning",
        order: 0,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      templateRepo._productStore.set("product_2", {
        id: "product_2",
        templateId: templateId,
        routineStep: "Moisturizer",
        productName: "CeraVe PM Moisturizer",
        productUrl: null,
        instructions: "Apply after serum",
        frequency: "Daily",
        days: null,
        timeOfDay: "evening",
        order: 0,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      // Mock createRoutineProduct for testing
      const productStore = new Map();
      let productIdCounter = 0;
      const createRoutineProduct = async (data: Parameters<CopyTemplateDeps["createRoutineProduct"]>[0]) => {
        const id = `rp_${++productIdCounter}`;
        const product = { ...data, id };
        productStore.set(id, product);
        return product;
      };

      const deps: CopyTemplateDeps = {
        templateRepo,
        routineRepo,
        createRoutineProduct,
        now: () => mockNow,
      };

      const input: CopyTemplateInput = {
        name: "Jane's Acne Routine",
        startDate: new Date("2025-01-20"),
        endDate: null,
      };

      const result = await copyTemplateToUser(templateId, userId, input, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        // Verify routine was created
        expect(result.data.routine.name).toBe("Jane's Acne Routine");
        expect(result.data.routine.startDate).toEqual(new Date("2025-01-20"));
        expect(result.data.routine.endDate).toBe(null);
        expect(result.data.routine.userProfileId).toBe(userId);
        expect(result.data.routine.status).toBe("draft");

        // Verify products were copied
        expect(result.data.products).toHaveLength(2);

        const morningProduct = result.data.products.find(p => p.timeOfDay === "morning");
        expect(morningProduct).toBeDefined();
        expect(morningProduct!.routineStep).toBe("Cleanser");
        expect(morningProduct!.productName).toBe("CeraVe Foaming Cleanser");
        expect(morningProduct!.productUrl).toBe("https://example.com/product1");
        expect(morningProduct!.instructions).toBe("Use morning and evening");
        expect(morningProduct!.frequency).toBe("Daily");
        expect(morningProduct!.days).toBe(null);
        expect(morningProduct!.order).toBe(0);

        const eveningProduct = result.data.products.find(p => p.timeOfDay === "evening");
        expect(eveningProduct).toBeDefined();
        expect(eveningProduct!.routineStep).toBe("Moisturizer");
        expect(eveningProduct!.productName).toBe("CeraVe PM Moisturizer");
      }
    });

    it("successfully copies template with custom name and dates", async () => {
      const templateRepo = makeTemplateRepoFake();
      const routineRepo = makeRoutineRepoFake();

      templateRepo._templateStore.set(templateId, {
        id: templateId,
        name: "Winter Routine Template",
        description: null,
        createdBy: adminId,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      // Mock createRoutineProduct for testing
      const productStore = new Map();
      let productIdCounter = 0;
      const createRoutineProduct = async (data: Parameters<CopyTemplateDeps["createRoutineProduct"]>[0]) => {
        const id = `rp_${++productIdCounter}`;
        const product = { ...data, id };
        productStore.set(id, product);
        return product;
      };

      const deps: CopyTemplateDeps = {
        templateRepo,
        routineRepo,
        createRoutineProduct,
        now: () => mockNow,
      };

      const input: CopyTemplateInput = {
        name: "Custom Winter Routine",
        startDate: new Date("2025-02-01"),
        endDate: new Date("2025-04-30"),
      };

      const result = await copyTemplateToUser(templateId, userId, input, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.routine.name).toBe("Custom Winter Routine");
        expect(result.data.routine.startDate).toEqual(new Date("2025-02-01"));
        expect(result.data.routine.endDate).toEqual(new Date("2025-04-30"));
      }
    });

    it("successfully copies template with no products", async () => {
      const templateRepo = makeTemplateRepoFake();
      const routineRepo = makeRoutineRepoFake();

      templateRepo._templateStore.set(templateId, {
        id: templateId,
        name: "Empty Template",
        description: null,
        createdBy: adminId,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      // Mock createRoutineProduct for testing
      const productStore = new Map();
      let productIdCounter = 0;
      const createRoutineProduct = async (data: Parameters<CopyTemplateDeps["createRoutineProduct"]>[0]) => {
        const id = `rp_${++productIdCounter}`;
        const product = { ...data, id };
        productStore.set(id, product);
        return product;
      };

      const deps: CopyTemplateDeps = {
        templateRepo,
        routineRepo,
        createRoutineProduct,
        now: () => mockNow,
      };

      const input: CopyTemplateInput = {
        name: "Empty Routine",
        startDate: new Date("2025-01-20"),
      };

      const result = await copyTemplateToUser(templateId, userId, input, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.routine.name).toBe("Empty Routine");
        expect(result.data.products).toEqual([]);
      }
    });

    it("returns error when template not found", async () => {
      const templateRepo = makeTemplateRepoFake();
      const routineRepo = makeRoutineRepoFake();

      // Mock createRoutineProduct for testing
      const productStore = new Map();
      let productIdCounter = 0;
      const createRoutineProduct = async (data: Parameters<CopyTemplateDeps["createRoutineProduct"]>[0]) => {
        const id = `rp_${++productIdCounter}`;
        const product = { ...data, id };
        productStore.set(id, product);
        return product;
      };

      const deps: CopyTemplateDeps = {
        templateRepo,
        routineRepo,
        createRoutineProduct,
        now: () => mockNow,
      };

      const input: CopyTemplateInput = {
        name: "Test Routine",
        startDate: new Date("2025-01-20"),
      };

      const result = await copyTemplateToUser("550e8400-e29b-41d4-a716-999999999999", userId, input, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Template not found");
      }
    });

    it("returns error when user already has a routine", async () => {
      const templateRepo = makeTemplateRepoFake();
      const routineRepo = makeRoutineRepoFake();

      templateRepo._templateStore.set(templateId, {
        id: templateId,
        name: "Template",
        description: null,
        createdBy: adminId,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      // User already has a routine
      routineRepo._store.set("existing_routine", {
        id: "existing_routine",
        userProfileId: userId,
        name: "Existing Routine",
        startDate: new Date("2025-01-01"),
        endDate: null,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      // Mock createRoutineProduct for testing
      const productStore = new Map();
      let productIdCounter = 0;
      const createRoutineProduct = async (data: Parameters<CopyTemplateDeps["createRoutineProduct"]>[0]) => {
        const id = `rp_${++productIdCounter}`;
        const product = { ...data, id };
        productStore.set(id, product);
        return product;
      };

      const deps: CopyTemplateDeps = {
        templateRepo,
        routineRepo,
        createRoutineProduct,
        now: () => mockNow,
      };

      const input: CopyTemplateInput = {
        name: "New Routine",
        startDate: new Date("2025-01-20"),
      };

      const result = await copyTemplateToUser(templateId, userId, input, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("User already has a routine");
      }
    });

    it("validates template ID format", async () => {
      const templateRepo = makeTemplateRepoFake();
      const routineRepo = makeRoutineRepoFake();

      // Mock createRoutineProduct for testing
      const productStore = new Map();
      let productIdCounter = 0;
      const createRoutineProduct = async (data: Parameters<CopyTemplateDeps["createRoutineProduct"]>[0]) => {
        const id = `rp_${++productIdCounter}`;
        const product = { ...data, id };
        productStore.set(id, product);
        return product;
      };

      const deps: CopyTemplateDeps = {
        templateRepo,
        routineRepo,
        createRoutineProduct,
        now: () => mockNow,
      };

      const input: CopyTemplateInput = {
        name: "Test Routine",
        startDate: new Date("2025-01-20"),
      };

      const result = await copyTemplateToUser("invalid-uuid", userId, input, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("validates user ID format", async () => {
      const templateRepo = makeTemplateRepoFake();
      const routineRepo = makeRoutineRepoFake();

      // Mock createRoutineProduct for testing
      const productStore = new Map();
      let productIdCounter = 0;
      const createRoutineProduct = async (data: Parameters<CopyTemplateDeps["createRoutineProduct"]>[0]) => {
        const id = `rp_${++productIdCounter}`;
        const product = { ...data, id };
        productStore.set(id, product);
        return product;
      };

      const deps: CopyTemplateDeps = {
        templateRepo,
        routineRepo,
        createRoutineProduct,
        now: () => mockNow,
      };

      const input: CopyTemplateInput = {
        name: "Test Routine",
        startDate: new Date("2025-01-20"),
      };

      const result = await copyTemplateToUser(templateId, "invalid-uuid", input, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("validates routine name is not empty", async () => {
      const templateRepo = makeTemplateRepoFake();
      const routineRepo = makeRoutineRepoFake();

      // Mock createRoutineProduct for testing
      const productStore = new Map();
      let productIdCounter = 0;
      const createRoutineProduct = async (data: Parameters<CopyTemplateDeps["createRoutineProduct"]>[0]) => {
        const id = `rp_${++productIdCounter}`;
        const product = { ...data, id };
        productStore.set(id, product);
        return product;
      };

      const deps: CopyTemplateDeps = {
        templateRepo,
        routineRepo,
        createRoutineProduct,
        now: () => mockNow,
      };

      const input: CopyTemplateInput = {
        name: "   ",
        startDate: new Date("2025-01-20"),
      };

      const result = await copyTemplateToUser(templateId, userId, input, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("trims whitespace from routine name", async () => {
      const templateRepo = makeTemplateRepoFake();
      const routineRepo = makeRoutineRepoFake();

      templateRepo._templateStore.set(templateId, {
        id: templateId,
        name: "Template",
        description: null,
        createdBy: adminId,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      // Mock createRoutineProduct for testing
      const productStore = new Map();
      let productIdCounter = 0;
      const createRoutineProduct = async (data: Parameters<CopyTemplateDeps["createRoutineProduct"]>[0]) => {
        const id = `rp_${++productIdCounter}`;
        const product = { ...data, id };
        productStore.set(id, product);
        return product;
      };

      const deps: CopyTemplateDeps = {
        templateRepo,
        routineRepo,
        createRoutineProduct,
        now: () => mockNow,
      };

      const input: CopyTemplateInput = {
        name: "  Trimmed Name  ",
        startDate: new Date("2025-01-20"),
      };

      const result = await copyTemplateToUser(templateId, userId, input, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.routine.name).toBe("Trimmed Name");
      }
    });

    it("preserves product order when copying", async () => {
      const templateRepo = makeTemplateRepoFake();
      const routineRepo = makeRoutineRepoFake();

      templateRepo._templateStore.set(templateId, {
        id: templateId,
        name: "Template",
        description: null,
        createdBy: adminId,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      // Add multiple products with specific order
      for (let i = 0; i < 3; i++) {
        templateRepo._productStore.set(`product_${i}`, {
          id: `product_${i}`,
          templateId: templateId,
          routineStep: `Step ${i}`,
          productName: `Product ${i}`,
          productUrl: null,
          instructions: `Instructions ${i}`,
          frequency: "Daily",
          days: null,
          timeOfDay: "morning",
          order: i,
          createdAt: mockNow,
          updatedAt: mockNow,
        });
      }

      // Mock createRoutineProduct for testing
      const productStore = new Map();
      let productIdCounter = 0;
      const createRoutineProduct = async (data: Parameters<CopyTemplateDeps["createRoutineProduct"]>[0]) => {
        const id = `rp_${++productIdCounter}`;
        const product = { ...data, id };
        productStore.set(id, product);
        return product;
      };

      const deps: CopyTemplateDeps = {
        templateRepo,
        routineRepo,
        createRoutineProduct,
        now: () => mockNow,
      };

      const input: CopyTemplateInput = {
        name: "Test Routine",
        startDate: new Date("2025-01-20"),
      };

      const result = await copyTemplateToUser(templateId, userId, input, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.products).toHaveLength(3);
        expect(result.data.products[0].order).toBe(0);
        expect(result.data.products[1].order).toBe(1);
        expect(result.data.products[2].order).toBe(2);
      }
    });

    it("handles template repo errors when fetching template", async () => {
      const templateRepo = makeTemplateRepoFake();
      const routineRepo = makeRoutineRepoFake();

      templateRepo.findById = async () => {
        throw new Error("Database connection failed");
      };

      // Mock createRoutineProduct for testing
      const productStore = new Map();
      let productIdCounter = 0;
      const createRoutineProduct = async (data: Parameters<CopyTemplateDeps["createRoutineProduct"]>[0]) => {
        const id = `rp_${++productIdCounter}`;
        const product = { ...data, id };
        productStore.set(id, product);
        return product;
      };

      const deps: CopyTemplateDeps = {
        templateRepo,
        routineRepo,
        createRoutineProduct,
        now: () => mockNow,
      };

      const input: CopyTemplateInput = {
        name: "Test Routine",
        startDate: new Date("2025-01-20"),
      };

      const result = await copyTemplateToUser(templateId, userId, input, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to copy template");
      }
    });

    it("handles routine repo errors when creating routine", async () => {
      const templateRepo = makeTemplateRepoFake();
      const routineRepo = makeRoutineRepoFake();

      templateRepo._templateStore.set(templateId, {
        id: templateId,
        name: "Template",
        description: null,
        createdBy: adminId,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      routineRepo.create = async () => {
        throw new Error("Database connection failed");
      };

      // Mock createRoutineProduct for testing
      const productStore = new Map();
      let productIdCounter = 0;
      const createRoutineProduct = async (data: Parameters<CopyTemplateDeps["createRoutineProduct"]>[0]) => {
        const id = `rp_${++productIdCounter}`;
        const product = { ...data, id };
        productStore.set(id, product);
        return product;
      };

      const deps: CopyTemplateDeps = {
        templateRepo,
        routineRepo,
        createRoutineProduct,
        now: () => mockNow,
      };

      const input: CopyTemplateInput = {
        name: "Test Routine",
        startDate: new Date("2025-01-20"),
      };

      const result = await copyTemplateToUser(templateId, userId, input, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to copy template");
      }
    });
  });
});

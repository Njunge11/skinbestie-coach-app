import { describe, it, expect } from "vitest";
import {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplateProducts,
  type TemplateDeps,
  type CreateTemplateInput,
  type UpdateTemplateInput,
} from "./actions";
import { makeTemplateRepoFake } from "./template.repo.fake";

// Fixed test data (follows TESTING.md)
const adminId = "550e8400-e29b-41d4-a716-446655440000";
const templateId = "550e8400-e29b-41d4-a716-446655440001";
const mockNow = new Date("2025-01-15T10:00:00Z");

describe("Template Actions - Unit Tests", () => {
  // ========================================
  // getTemplates Tests
  // ========================================
  describe("getTemplates", () => {
    it("returns empty array when no templates exist", async () => {
      const repo = makeTemplateRepoFake();
      const deps: TemplateDeps = { repo, now: () => mockNow };

      const result = await getTemplates(deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it("returns all templates sorted by creation date", async () => {
      const repo = makeTemplateRepoFake();

      // Manually set up templates
      repo._templateStore.set("template_1", {
        id: "template_1",
        name: "Template 1",
        description: "First template",
        createdBy: adminId,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      });

      repo._templateStore.set("template_2", {
        id: "template_2",
        name: "Template 2",
        description: "Second template",
        createdBy: adminId,
        createdAt: new Date("2025-01-02"),
        updatedAt: new Date("2025-01-02"),
      });

      const deps: TemplateDeps = { repo, now: () => mockNow };

      const result = await getTemplates(deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].name).toBe("Template 2"); // Newer first
        expect(result.data[1].name).toBe("Template 1");
      }
    });

    it("handles repository errors", async () => {
      const repo = makeTemplateRepoFake();
      repo.findAll = async () => {
        throw new Error("Database connection failed");
      };

      const deps: TemplateDeps = { repo, now: () => mockNow };

      const result = await getTemplates(deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to fetch templates");
      }
    });
  });

  // ========================================
  // getTemplate Tests
  // ========================================
  describe("getTemplate", () => {
    it("returns template when found", async () => {
      const repo = makeTemplateRepoFake();

      repo._templateStore.set(templateId, {
        id: templateId,
        name: "Acne Treatment Routine",
        description: "For acne-prone skin",
        createdBy: adminId,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      const deps: TemplateDeps = { repo, now: () => mockNow };

      const result = await getTemplate(templateId, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(templateId);
        expect(result.data.name).toBe("Acne Treatment Routine");
      }
    });

    it("returns error when template not found", async () => {
      const repo = makeTemplateRepoFake();
      const deps: TemplateDeps = { repo, now: () => mockNow };

      const result = await getTemplate("550e8400-e29b-41d4-a716-999999999999", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Template not found");
      }
    });

    it("validates UUID format", async () => {
      const repo = makeTemplateRepoFake();
      const deps: TemplateDeps = { repo, now: () => mockNow };

      const result = await getTemplate("invalid-uuid", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid template ID");
      }
    });

    it("handles repository errors", async () => {
      const repo = makeTemplateRepoFake();
      repo.findById = async () => {
        throw new Error("Database connection failed");
      };

      const deps: TemplateDeps = { repo, now: () => mockNow };

      const result = await getTemplate(templateId, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to fetch template");
      }
    });
  });

  // ========================================
  // createTemplate Tests
  // ========================================
  describe("createTemplate", () => {
    it("successfully creates template with all fields", async () => {
      const repo = makeTemplateRepoFake();
      const deps: TemplateDeps = { repo, now: () => mockNow };

      const input: CreateTemplateInput = {
        name: "Winter Skincare Routine",
        description: "For dry winter skin",
      };

      const result = await createTemplate(adminId, input, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Winter Skincare Routine");
        expect(result.data.description).toBe("For dry winter skin");
        expect(result.data.createdBy).toBe(adminId);
        expect(result.data.createdAt).toEqual(mockNow);
        expect(result.data.updatedAt).toEqual(mockNow);
      }
    });

    it("successfully creates template without description", async () => {
      const repo = makeTemplateRepoFake();
      const deps: TemplateDeps = { repo, now: () => mockNow };

      const input: CreateTemplateInput = {
        name: "Basic Routine",
      };

      const result = await createTemplate(adminId, input, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Basic Routine");
        expect(result.data.description).toBe(null);
      }
    });

    it("trims whitespace from name", async () => {
      const repo = makeTemplateRepoFake();
      const deps: TemplateDeps = { repo, now: () => mockNow };

      const input: CreateTemplateInput = {
        name: "  Trimmed Name  ",
      };

      const result = await createTemplate(adminId, input, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Trimmed Name");
      }
    });

    it("rejects empty name", async () => {
      const repo = makeTemplateRepoFake();
      const deps: TemplateDeps = { repo, now: () => mockNow };

      const input: CreateTemplateInput = {
        name: "   ",
      };

      const result = await createTemplate(adminId, input, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("validates admin ID format", async () => {
      const repo = makeTemplateRepoFake();
      const deps: TemplateDeps = { repo, now: () => mockNow };

      const input: CreateTemplateInput = {
        name: "Test Template",
      };

      const result = await createTemplate("invalid-uuid", input, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("handles repository errors", async () => {
      const repo = makeTemplateRepoFake();
      repo.create = async () => {
        throw new Error("Database connection failed");
      };

      const deps: TemplateDeps = { repo, now: () => mockNow };

      const input: CreateTemplateInput = {
        name: "Test Template",
      };

      const result = await createTemplate(adminId, input, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to create template");
      }
    });
  });

  // ========================================
  // updateTemplate Tests
  // ========================================
  describe("updateTemplate", () => {
    it("successfully updates template name", async () => {
      const repo = makeTemplateRepoFake();

      repo._templateStore.set(templateId, {
        id: templateId,
        name: "Old Name",
        description: "Description",
        createdBy: adminId,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      const laterTime = new Date("2025-01-15T11:00:00Z");
      const deps: TemplateDeps = { repo, now: () => laterTime };

      const updates: UpdateTemplateInput = {
        name: "New Name",
      };

      const result = await updateTemplate(templateId, updates, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("New Name");
        expect(result.data.updatedAt).toEqual(laterTime);
        expect(result.data.createdAt).toEqual(mockNow);
      }
    });

    it("successfully updates description", async () => {
      const repo = makeTemplateRepoFake();

      repo._templateStore.set(templateId, {
        id: templateId,
        name: "Template Name",
        description: "Old description",
        createdBy: adminId,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      const laterTime = new Date("2025-01-15T11:00:00Z");
      const deps: TemplateDeps = { repo, now: () => laterTime };

      const updates: UpdateTemplateInput = {
        description: "New description",
      };

      const result = await updateTemplate(templateId, updates, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe("New description");
      }
    });

    it("successfully clears description", async () => {
      const repo = makeTemplateRepoFake();

      repo._templateStore.set(templateId, {
        id: templateId,
        name: "Template Name",
        description: "Some description",
        createdBy: adminId,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      const deps: TemplateDeps = { repo, now: () => mockNow };

      const updates: UpdateTemplateInput = {
        description: null,
      };

      const result = await updateTemplate(templateId, updates, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe(null);
      }
    });

    it("trims whitespace from name", async () => {
      const repo = makeTemplateRepoFake();

      repo._templateStore.set(templateId, {
        id: templateId,
        name: "Old Name",
        description: null,
        createdBy: adminId,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      const deps: TemplateDeps = { repo, now: () => mockNow };

      const updates: UpdateTemplateInput = {
        name: "  Trimmed  ",
      };

      const result = await updateTemplate(templateId, updates, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Trimmed");
      }
    });

    it("returns error when template not found", async () => {
      const repo = makeTemplateRepoFake();
      const deps: TemplateDeps = { repo, now: () => mockNow };

      const updates: UpdateTemplateInput = {
        name: "New Name",
      };

      const result = await updateTemplate("550e8400-e29b-41d4-a716-999999999999", updates, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Template not found");
      }
    });

    it("validates template ID format", async () => {
      const repo = makeTemplateRepoFake();
      const deps: TemplateDeps = { repo, now: () => mockNow };

      const updates: UpdateTemplateInput = {
        name: "New Name",
      };

      const result = await updateTemplate("invalid-uuid", updates, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("rejects empty name", async () => {
      const repo = makeTemplateRepoFake();

      repo._templateStore.set(templateId, {
        id: templateId,
        name: "Old Name",
        description: null,
        createdBy: adminId,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      const deps: TemplateDeps = { repo, now: () => mockNow };

      const updates: UpdateTemplateInput = {
        name: "   ",
      };

      const result = await updateTemplate(templateId, updates, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("handles repository errors", async () => {
      const repo = makeTemplateRepoFake();
      repo.update = async () => {
        throw new Error("Database connection failed");
      };

      const deps: TemplateDeps = { repo, now: () => mockNow };

      const updates: UpdateTemplateInput = {
        name: "New Name",
      };

      const result = await updateTemplate(templateId, updates, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to update template");
      }
    });
  });

  // ========================================
  // deleteTemplate Tests
  // ========================================
  describe("deleteTemplate", () => {
    it("successfully deletes template", async () => {
      const repo = makeTemplateRepoFake();

      repo._templateStore.set(templateId, {
        id: templateId,
        name: "Template to Delete",
        description: null,
        createdBy: adminId,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      const deps: TemplateDeps = { repo, now: () => mockNow };

      const result = await deleteTemplate(templateId, deps);

      expect(result.success).toBe(true);
      expect(repo._templateStore.has(templateId)).toBe(false);
    });

    it("cascades to delete template products", async () => {
      const repo = makeTemplateRepoFake();

      repo._templateStore.set(templateId, {
        id: templateId,
        name: "Template",
        description: null,
        createdBy: adminId,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      repo._productStore.set("product_1", {
        id: "product_1",
        templateId: templateId,
        routineStep: "Cleanser",
        productName: "Product 1",
        productUrl: null,
        instructions: "Use daily",
        frequency: "daily",
        days: null,
        timeOfDay: "morning",
        order: 0,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      repo._productStore.set("product_2", {
        id: "product_2",
        templateId: templateId,
        routineStep: "Moisturizer",
        productName: "Product 2",
        productUrl: null,
        instructions: "Use daily",
        frequency: "daily",
        days: null,
        timeOfDay: "evening",
        order: 0,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      const deps: TemplateDeps = { repo, now: () => mockNow };

      const result = await deleteTemplate(templateId, deps);

      expect(result.success).toBe(true);
      expect(repo._templateStore.has(templateId)).toBe(false);
      expect(repo._productStore.has("product_1")).toBe(false);
      expect(repo._productStore.has("product_2")).toBe(false);
    });

    it("returns error when template not found", async () => {
      const repo = makeTemplateRepoFake();
      const deps: TemplateDeps = { repo, now: () => mockNow };

      const result = await deleteTemplate("550e8400-e29b-41d4-a716-999999999999", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Template not found");
      }
    });

    it("validates template ID format", async () => {
      const repo = makeTemplateRepoFake();
      const deps: TemplateDeps = { repo, now: () => mockNow };

      const result = await deleteTemplate("invalid-uuid", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("handles repository errors", async () => {
      const repo = makeTemplateRepoFake();
      repo.deleteById = async () => {
        throw new Error("Database connection failed");
      };

      const deps: TemplateDeps = { repo, now: () => mockNow };

      const result = await deleteTemplate(templateId, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to delete template");
      }
    });
  });

  // ========================================
  // getTemplateProducts Tests
  // ========================================
  describe("getTemplateProducts", () => {
    it("returns empty array when no products exist", async () => {
      const repo = makeTemplateRepoFake();
      const deps: TemplateDeps = { repo, now: () => mockNow };

      const result = await getTemplateProducts(templateId, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it("returns products sorted by timeOfDay and order", async () => {
      const repo = makeTemplateRepoFake();

      repo._productStore.set("product_1", {
        id: "product_1",
        templateId: templateId,
        routineStep: "Moisturizer",
        productName: "Evening Product",
        productUrl: null,
        instructions: "Apply at night",
        frequency: "daily",
        days: null,
        timeOfDay: "evening",
        order: 0,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      repo._productStore.set("product_2", {
        id: "product_2",
        templateId: templateId,
        routineStep: "Cleanser",
        productName: "Morning Product",
        productUrl: null,
        instructions: "Use daily",
        frequency: "daily",
        days: null,
        timeOfDay: "morning",
        order: 0,
        createdAt: mockNow,
        updatedAt: mockNow,
      });

      const deps: TemplateDeps = { repo, now: () => mockNow };

      const result = await getTemplateProducts(templateId, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].timeOfDay).toBe("morning");
        expect(result.data[1].timeOfDay).toBe("evening");
      }
    });

    it("validates template ID format", async () => {
      const repo = makeTemplateRepoFake();
      const deps: TemplateDeps = { repo, now: () => mockNow };

      const result = await getTemplateProducts("invalid-uuid", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid template ID");
      }
    });

    it("handles repository errors", async () => {
      const repo = makeTemplateRepoFake();
      repo.findProductsByTemplateId = async () => {
        throw new Error("Database connection failed");
      };

      const deps: TemplateDeps = { repo, now: () => mockNow };

      const result = await getTemplateProducts(templateId, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to fetch template products");
      }
    });
  });

  // Note: Additional tests for createTemplateProduct, updateTemplateProduct,
  // deleteTemplateProduct, and reorderTemplateProducts would follow the same patterns.
  // Omitted for brevity but should be implemented following TESTING.md guidelines.
});

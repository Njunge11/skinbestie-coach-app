import { describe, it, expect } from "vitest";
import {
  getRoutineProducts,
  getRoutineProductsByTimeOfDay,
  createRoutineProduct,
  updateRoutineProduct,
  deleteRoutineProduct,
  reorderRoutineProducts,
  type RoutineProductDeps,
} from "./actions";
import { makeRoutineProductsRepoFake } from "./routine.repo.fake";

describe("Routine Product Actions - Unit Tests", () => {
  // Test UUIDs
  const user1Id = "550e8400-e29b-41d4-a716-446655440000";
  const user2Id = "550e8400-e29b-41d4-a716-446655440001";
  const product1Id = "650e8400-e29b-41d4-a716-446655440001";
  const product2Id = "650e8400-e29b-41d4-a716-446655440002";
  const product3Id = "650e8400-e29b-41d4-a716-446655440003";

  describe("getRoutineProducts", () => {
    it("returns empty array when user has no routine products", async () => {
      const repo = makeRoutineProductsRepoFake();
      const deps: RoutineProductDeps = {
        repo,
        now: () => new Date("2025-01-15T12:00:00Z")
        
      };

      const result = await getRoutineProducts(user1Id, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it("returns all routine products for a user ordered by timeOfDay then order", async () => {
      const repo = makeRoutineProductsRepoFake();

      // Add evening product first (order should prioritize morning)
      repo._store.set(product1Id, {
        id: product1Id,
        userProfileId: user1Id,
        routineStep: "Cleanser",
        productName: "Evening Cleanser",
        instructions: "Apply to face",
        frequency: "Daily",
        timeOfDay: "evening",
        order: 0,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      });

      // Add morning product
      repo._store.set(product2Id, {
        id: product2Id,
        userProfileId: user1Id,
        routineStep: "Cleanser",
        productName: "Morning Cleanser",
        instructions: "Apply to face",
        frequency: "Daily",
        timeOfDay: "morning",
        order: 0,
        createdAt: new Date("2025-01-02"),
        updatedAt: new Date("2025-01-02"),
      });

      const deps: RoutineProductDeps = {
        repo,
        now: () => new Date("2025-01-15T12:00:00Z")
        
      };

      const result = await getRoutineProducts(user1Id, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        // Morning should come first
        expect(result.data[0].timeOfDay).toBe("morning");
        expect(result.data[1].timeOfDay).toBe("evening");
      }
    });

    it("does not return products belonging to other users", async () => {
      const repo = makeRoutineProductsRepoFake();

      repo._store.set(product1Id, {
        id: product1Id,
        userProfileId: user1Id,
        routineStep: "Cleanser",
        productName: "User 1 Product",
        instructions: "Instructions",
        frequency: "Daily",
        timeOfDay: "morning",
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      repo._store.set(product2Id, {
        id: product2Id,
        userProfileId: user2Id,
        routineStep: "Cleanser",
        productName: "User 2 Product",
        instructions: "Instructions",
        frequency: "Daily",
        timeOfDay: "morning",
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const deps: RoutineProductDeps = {
        repo,
        now: () => new Date("2025-01-15T12:00:00Z")
        
      };

      const result = await getRoutineProducts(user1Id, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].userProfileId).toBe(user1Id);
      }
    });

    it("returns error when userId is invalid format", async () => {
      const deps: RoutineProductDeps = {
        repo: makeRoutineProductsRepoFake(),
        now: () => new Date("2025-01-15T12:00:00Z")
        
      };

      const result = await getRoutineProducts("invalid-id", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid user ID");
      }
    });
  });

  describe("getRoutineProductsByTimeOfDay", () => {
    it("returns only morning products when timeOfDay is morning", async () => {
      const repo = makeRoutineProductsRepoFake();

      repo._store.set(product1Id, {
        id: product1Id,
        userProfileId: user1Id,
        routineStep: "Cleanser",
        productName: "Morning Cleanser",
        instructions: "Apply to face",
        frequency: "Daily",
        timeOfDay: "morning",
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      repo._store.set(product2Id, {
        id: product2Id,
        userProfileId: user1Id,
        routineStep: "Cleanser",
        productName: "Evening Cleanser",
        instructions: "Apply to face",
        frequency: "Daily",
        timeOfDay: "evening",
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const deps: RoutineProductDeps = {
        repo,
        now: () => new Date("2025-01-15T12:00:00Z")
        
      };

      const result = await getRoutineProductsByTimeOfDay(user1Id, "morning", deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].timeOfDay).toBe("morning");
      }
    });

    it("returns only evening products when timeOfDay is evening", async () => {
      const repo = makeRoutineProductsRepoFake();

      repo._store.set(product1Id, {
        id: product1Id,
        userProfileId: user1Id,
        routineStep: "Cleanser",
        productName: "Morning Cleanser",
        instructions: "Apply to face",
        frequency: "Daily",
        timeOfDay: "morning",
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      repo._store.set(product2Id, {
        id: product2Id,
        userProfileId: user1Id,
        routineStep: "Cleanser",
        productName: "Evening Cleanser",
        instructions: "Apply to face",
        frequency: "Daily",
        timeOfDay: "evening",
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const deps: RoutineProductDeps = {
        repo,
        now: () => new Date("2025-01-15T12:00:00Z")
        
      };

      const result = await getRoutineProductsByTimeOfDay(user1Id, "evening", deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].timeOfDay).toBe("evening");
      }
    });

    it("returns products in correct order", async () => {
      const repo = makeRoutineProductsRepoFake();

      repo._store.set(product1Id, {
        id: product1Id,
        userProfileId: user1Id,
        routineStep: "Moisturizer",
        productName: "Product 1",
        instructions: "Apply",
        frequency: "Daily",
        timeOfDay: "morning",
        order: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      repo._store.set(product2Id, {
        id: product2Id,
        userProfileId: user1Id,
        routineStep: "Cleanser",
        productName: "Product 2",
        instructions: "Apply",
        frequency: "Daily",
        timeOfDay: "morning",
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      repo._store.set(product3Id, {
        id: product3Id,
        userProfileId: user1Id,
        routineStep: "Serum",
        productName: "Product 3",
        instructions: "Apply",
        frequency: "Daily",
        timeOfDay: "morning",
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const deps: RoutineProductDeps = {
        repo,
        now: () => new Date("2025-01-15T12:00:00Z")
        
      };

      const result = await getRoutineProductsByTimeOfDay(user1Id, "morning", deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(3);
        expect(result.data[0].order).toBe(0);
        expect(result.data[1].order).toBe(1);
        expect(result.data[2].order).toBe(2);
      }
    });

    it("returns error when userId is invalid format", async () => {
      const deps: RoutineProductDeps = {
        repo: makeRoutineProductsRepoFake(),
        now: () => new Date("2025-01-15T12:00:00Z")
        
      };

      const result = await getRoutineProductsByTimeOfDay("invalid-id", "morning", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });
  });

  describe("createRoutineProduct", () => {
    it("creates routine product successfully with all required fields", async () => {
      const repo = makeRoutineProductsRepoFake();
      const fixedNow = new Date("2025-01-15T10:30:00Z");

      const deps: RoutineProductDeps = {
        repo,
        now: () => fixedNow
        
      };

      const data = {
        routineStep: "Cleanser",
        productName: "CeraVe Hydrating Cleanser",
        instructions: "Apply to damp skin",
        frequency: "Daily",
        timeOfDay: "morning" as const,
      };

      const result = await createRoutineProduct(user1Id, data, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.routineStep).toBe("Cleanser");
        expect(result.data.productName).toBe("CeraVe Hydrating Cleanser");
        expect(result.data.instructions).toBe("Apply to damp skin");
        expect(result.data.frequency).toBe("Daily");
        expect(result.data.timeOfDay).toBe("morning");
      }
    });

    it("creates routine product with optional productUrl", async () => {
      const repo = makeRoutineProductsRepoFake();

      const deps: RoutineProductDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const data = {
        routineStep: "Cleanser",
        productName: "CeraVe Hydrating Cleanser",
        productUrl: "https://example.com/product",
        instructions: "Apply to damp skin",
        frequency: "Daily",
        timeOfDay: "morning" as const,
      };

      const result = await createRoutineProduct(user1Id, data, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.productUrl).toBe("https://example.com/product");
      }
    });

    it("creates routine product with optional days for non-daily frequency", async () => {
      const repo = makeRoutineProductsRepoFake();

      const deps: RoutineProductDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const data = {
        routineStep: "Exfoliant",
        productName: "AHA Toner",
        instructions: "Apply with cotton pad",
        frequency: "2x per week",
        days: ["Monday", "Thursday"],
        timeOfDay: "evening" as const,
      };

      const result = await createRoutineProduct(user1Id, data, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.days).toEqual(["Monday", "Thursday"]);
      }
    });

    it("sets order to 0 when it's the first product for that time of day", async () => {
      const repo = makeRoutineProductsRepoFake();

      const deps: RoutineProductDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const data = {
        routineStep: "Cleanser",
        productName: "First Morning Product",
        instructions: "Apply",
        frequency: "Daily",
        timeOfDay: "morning" as const,
      };

      const result = await createRoutineProduct(user1Id, data, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.order).toBe(0);
      }
    });

    it("sets order to max+1 when adding to existing products for same time of day", async () => {
      const repo = makeRoutineProductsRepoFake();

      // Add existing morning products
      repo._store.set(product1Id, {
        id: product1Id,
        userProfileId: user1Id,
        routineStep: "Cleanser",
        productName: "Product 1",
        instructions: "Apply",
        frequency: "Daily",
        timeOfDay: "morning",
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      repo._store.set(product2Id, {
        id: product2Id,
        userProfileId: user1Id,
        routineStep: "Serum",
        productName: "Product 2",
        instructions: "Apply",
        frequency: "Daily",
        timeOfDay: "morning",
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const deps: RoutineProductDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const data = {
        routineStep: "Moisturizer",
        productName: "Third Morning Product",
        instructions: "Apply",
        frequency: "Daily",
        timeOfDay: "morning" as const,
      };

      const result = await createRoutineProduct(user1Id, data, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.order).toBe(2);
      }
    });

    it("sets order to 0 for evening product when morning products exist", async () => {
      const repo = makeRoutineProductsRepoFake();

      // Add existing morning products
      repo._store.set(product1Id, {
        id: product1Id,
        userProfileId: user1Id,
        routineStep: "Cleanser",
        productName: "Morning Product",
        instructions: "Apply",
        frequency: "Daily",
        timeOfDay: "morning",
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const deps: RoutineProductDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const data = {
        routineStep: "Cleanser",
        productName: "First Evening Product",
        instructions: "Apply",
        frequency: "Daily",
        timeOfDay: "evening" as const,
      };

      const result = await createRoutineProduct(user1Id, data, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.order).toBe(0);
      }
    });

    it("sets createdAt and updatedAt timestamps using injected now()", async () => {
      const repo = makeRoutineProductsRepoFake();
      const fixedNow = new Date("2025-01-15T10:30:00Z");

      const deps: RoutineProductDeps = {
        repo,
        now: () => fixedNow
        
      };

      const data = {
        routineStep: "Cleanser",
        productName: "Product",
        instructions: "Apply",
        frequency: "Daily",
        timeOfDay: "morning" as const,
      };

      const result = await createRoutineProduct(user1Id, data, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.createdAt).toEqual(fixedNow);
        expect(result.data.updatedAt).toEqual(fixedNow);
      }
    });

    it("returns error when userId is invalid format", async () => {
      const deps: RoutineProductDeps = {
        repo: makeRoutineProductsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const data = {
        routineStep: "Cleanser",
        productName: "Product",
        instructions: "Apply",
        frequency: "Daily",
        timeOfDay: "morning" as const,
      };

      const result = await createRoutineProduct("invalid-id", data, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when routineStep is missing", async () => {
      const deps: RoutineProductDeps = {
        repo: makeRoutineProductsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const data = {
        routineStep: "",
        productName: "Product",
        instructions: "Apply",
        frequency: "Daily",
        timeOfDay: "morning" as const,
      };

      const result = await createRoutineProduct(user1Id, data, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when productName is missing", async () => {
      const deps: RoutineProductDeps = {
        repo: makeRoutineProductsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const data = {
        routineStep: "Cleanser",
        productName: "",
        instructions: "Apply",
        frequency: "Daily",
        timeOfDay: "morning" as const,
      };

      const result = await createRoutineProduct(user1Id, data, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when instructions are missing", async () => {
      const deps: RoutineProductDeps = {
        repo: makeRoutineProductsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const data = {
        routineStep: "Cleanser",
        productName: "Product",
        instructions: "",
        frequency: "Daily",
        timeOfDay: "morning" as const,
      };

      const result = await createRoutineProduct(user1Id, data, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when frequency is missing", async () => {
      const deps: RoutineProductDeps = {
        repo: makeRoutineProductsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const data = {
        routineStep: "Cleanser",
        productName: "Product",
        instructions: "Apply",
        frequency: "",
        timeOfDay: "morning" as const,
      };

      const result = await createRoutineProduct(user1Id, data, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when timeOfDay is invalid", async () => {
      const deps: RoutineProductDeps = {
        repo: makeRoutineProductsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const data = {
        routineStep: "Cleanser",
        productName: "Product",
        instructions: "Apply",
        frequency: "Daily",
        timeOfDay: "afternoon" as any,
      };

      const result = await createRoutineProduct(user1Id, data, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when routineStep is whitespace only", async () => {
      const deps: RoutineProductDeps = {
        repo: makeRoutineProductsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const data = {
        routineStep: "   ",
        productName: "Product",
        instructions: "Apply",
        frequency: "Daily",
        timeOfDay: "morning" as const,
      };

      const result = await createRoutineProduct(user1Id, data, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when productName is whitespace only", async () => {
      const deps: RoutineProductDeps = {
        repo: makeRoutineProductsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const data = {
        routineStep: "Cleanser",
        productName: "   ",
        instructions: "Apply",
        frequency: "Daily",
        timeOfDay: "morning" as const,
      };

      const result = await createRoutineProduct(user1Id, data, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when instructions are whitespace only", async () => {
      const deps: RoutineProductDeps = {
        repo: makeRoutineProductsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const data = {
        routineStep: "Cleanser",
        productName: "Product",
        instructions: "   ",
        frequency: "Daily",
        timeOfDay: "morning" as const,
      };

      const result = await createRoutineProduct(user1Id, data, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when frequency is whitespace only", async () => {
      const deps: RoutineProductDeps = {
        repo: makeRoutineProductsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const data = {
        routineStep: "Cleanser",
        productName: "Product",
        instructions: "Apply",
        frequency: "   ",
        timeOfDay: "morning" as const,
      };

      const result = await createRoutineProduct(user1Id, data, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });
  });

  describe("updateRoutineProduct", () => {
    it("updates product name successfully", async () => {
      const repo = makeRoutineProductsRepoFake();

      repo._store.set(product1Id, {
        id: product1Id,
        userProfileId: user1Id,
        routineStep: "Cleanser",
        productName: "Old Product",
        instructions: "Apply",
        frequency: "Daily",
        timeOfDay: "morning",
        order: 0,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: RoutineProductDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await updateRoutineProduct(product1Id, { productName: "New Product" }, deps);

      expect(result.success).toBe(true);
      expect(repo._store.get(product1Id)!.productName).toBe("New Product");
    });

    it("updates productUrl successfully", async () => {
      const repo = makeRoutineProductsRepoFake();

      repo._store.set(product1Id, {
        id: product1Id,
        userProfileId: user1Id,
        routineStep: "Cleanser",
        productName: "Product",
        instructions: "Apply",
        frequency: "Daily",
        timeOfDay: "morning",
        order: 0,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: RoutineProductDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await updateRoutineProduct(
        product1Id,
        { productUrl: "https://example.com/new-url" },
        deps
      );

      expect(result.success).toBe(true);
      expect(repo._store.get(product1Id)!.productUrl).toBe("https://example.com/new-url");
    });

    it("updates frequency and days successfully", async () => {
      const repo = makeRoutineProductsRepoFake();

      repo._store.set(product1Id, {
        id: product1Id,
        userProfileId: user1Id,
        routineStep: "Exfoliant",
        productName: "Product",
        instructions: "Apply",
        frequency: "Daily",
        timeOfDay: "evening",
        order: 0,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: RoutineProductDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await updateRoutineProduct(
        product1Id,
        {
          frequency: "2x per week",
          days: ["Monday", "Thursday"],
        },
        deps
      );

      expect(result.success).toBe(true);
      const updated = repo._store.get(product1Id)!;
      expect(updated.frequency).toBe("2x per week");
      expect(updated.days).toEqual(["Monday", "Thursday"]);
    });

    it("updates updatedAt timestamp", async () => {
      const repo = makeRoutineProductsRepoFake();

      repo._store.set(product1Id, {
        id: product1Id,
        userProfileId: user1Id,
        routineStep: "Cleanser",
        productName: "Product",
        instructions: "Apply",
        frequency: "Daily",
        timeOfDay: "morning",
        order: 0,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const fixedNow = new Date("2025-01-15T10:30:00Z");
      const deps: RoutineProductDeps = {
        repo,
        now: () => fixedNow
        
      };

      const result = await updateRoutineProduct(product1Id, { productName: "Updated" }, deps);

      expect(result.success).toBe(true);
      expect(repo._store.get(product1Id)!.updatedAt).toEqual(fixedNow);
    });

    it("returns error when productId is invalid format", async () => {
      const deps: RoutineProductDeps = {
        repo: makeRoutineProductsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await updateRoutineProduct("invalid-id", { productName: "Test" }, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when product not found", async () => {
      const deps: RoutineProductDeps = {
        repo: makeRoutineProductsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await updateRoutineProduct("550e8400-e29b-41d4-a716-999999999999", { productName: "Test" }, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Routine product not found");
      }
    });

    it("returns error when updating productName to empty string", async () => {
      const repo = makeRoutineProductsRepoFake();

      repo._store.set(product1Id, {
        id: product1Id,
        userProfileId: user1Id,
        routineStep: "Cleanser",
        productName: "Valid Product",
        instructions: "Apply",
        frequency: "Daily",
        timeOfDay: "morning",
        order: 0,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: RoutineProductDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await updateRoutineProduct(product1Id, { productName: "" }, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when updating instructions to empty string", async () => {
      const repo = makeRoutineProductsRepoFake();

      repo._store.set(product1Id, {
        id: product1Id,
        userProfileId: user1Id,
        routineStep: "Cleanser",
        productName: "Product",
        instructions: "Valid instructions",
        frequency: "Daily",
        timeOfDay: "morning",
        order: 0,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: RoutineProductDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await updateRoutineProduct(product1Id, { instructions: "" }, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when updating routineStep to whitespace", async () => {
      const repo = makeRoutineProductsRepoFake();

      repo._store.set(product1Id, {
        id: product1Id,
        userProfileId: user1Id,
        routineStep: "Cleanser",
        productName: "Product",
        instructions: "Instructions",
        frequency: "Daily",
        timeOfDay: "morning",
        order: 0,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: RoutineProductDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await updateRoutineProduct(product1Id, { routineStep: "   " }, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when updating productName to whitespace", async () => {
      const repo = makeRoutineProductsRepoFake();

      repo._store.set(product1Id, {
        id: product1Id,
        userProfileId: user1Id,
        routineStep: "Cleanser",
        productName: "Valid Product",
        instructions: "Instructions",
        frequency: "Daily",
        timeOfDay: "morning",
        order: 0,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: RoutineProductDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await updateRoutineProduct(product1Id, { productName: "   " }, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when updating instructions to whitespace", async () => {
      const repo = makeRoutineProductsRepoFake();

      repo._store.set(product1Id, {
        id: product1Id,
        userProfileId: user1Id,
        routineStep: "Cleanser",
        productName: "Product",
        instructions: "Valid instructions",
        frequency: "Daily",
        timeOfDay: "morning",
        order: 0,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: RoutineProductDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await updateRoutineProduct(product1Id, { instructions: "   " }, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when updating frequency to whitespace", async () => {
      const repo = makeRoutineProductsRepoFake();

      repo._store.set(product1Id, {
        id: product1Id,
        userProfileId: user1Id,
        routineStep: "Cleanser",
        productName: "Product",
        instructions: "Instructions",
        frequency: "Daily",
        timeOfDay: "morning",
        order: 0,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: RoutineProductDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await updateRoutineProduct(product1Id, { frequency: "   " }, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });
  });

  describe("deleteRoutineProduct", () => {
    it("deletes routine product successfully", async () => {
      const repo = makeRoutineProductsRepoFake();

      repo._store.set(product1Id, {
        id: product1Id,
        userProfileId: user1Id,
        routineStep: "Cleanser",
        productName: "Product to delete",
        instructions: "Apply",
        frequency: "Daily",
        timeOfDay: "morning",
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const deps: RoutineProductDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await deleteRoutineProduct(product1Id, deps);

      expect(result.success).toBe(true);
      expect(repo._store.has(product1Id)).toBe(false);
    });

    it("returns error when productId is invalid format", async () => {
      const deps: RoutineProductDeps = {
        repo: makeRoutineProductsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await deleteRoutineProduct("invalid-id", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when product not found", async () => {
      const deps: RoutineProductDeps = {
        repo: makeRoutineProductsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await deleteRoutineProduct("550e8400-e29b-41d4-a716-999999999999", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Routine product not found");
      }
    });
  });

  describe("reorderRoutineProducts", () => {
    it("updates order values for all products in new sequence", async () => {
      const repo = makeRoutineProductsRepoFake();

      // Given: three morning products with initial order 0, 1, 2
      repo._store.set(product1Id, {
        id: product1Id,
        userProfileId: user1Id,
        routineStep: "Cleanser",
        productName: "First",
        instructions: "Apply",
        frequency: "Daily",
        timeOfDay: "morning",
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date("2024-01-01"),
      });

      repo._store.set(product2Id, {
        id: product2Id,
        userProfileId: user1Id,
        routineStep: "Serum",
        productName: "Second",
        instructions: "Apply",
        frequency: "Daily",
        timeOfDay: "morning",
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date("2024-01-01"),
      });

      repo._store.set(product3Id, {
        id: product3Id,
        userProfileId: user1Id,
        routineStep: "Moisturizer",
        productName: "Third",
        instructions: "Apply",
        frequency: "Daily",
        timeOfDay: "morning",
        order: 2,
        createdAt: new Date(),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: RoutineProductDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      // When: reordering to [product_3, product_1, product_2]
      const result = await reorderRoutineProducts(
        user1Id,
        "morning",
        [product3Id, product1Id, product2Id],
        deps
      );

      // Then: success and order values updated
      expect(result.success).toBe(true);
      expect(repo._store.get(product3Id)!.order).toBe(0);
      expect(repo._store.get(product1Id)!.order).toBe(1);
      expect(repo._store.get(product2Id)!.order).toBe(2);
    });

    it("only reorders products for the specified time of day", async () => {
      const repo = makeRoutineProductsRepoFake();

      // Morning products
      repo._store.set("750e8400-e29b-41d4-a716-446655440001", {
        id: "750e8400-e29b-41d4-a716-446655440001",
        userProfileId: user1Id,
        routineStep: "Cleanser",
        productName: "Morning 1",
        instructions: "Apply",
        frequency: "Daily",
        timeOfDay: "morning",
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      repo._store.set("750e8400-e29b-41d4-a716-446655440002", {
        id: "750e8400-e29b-41d4-a716-446655440002",
        userProfileId: user1Id,
        routineStep: "Serum",
        productName: "Morning 2",
        instructions: "Apply",
        frequency: "Daily",
        timeOfDay: "morning",
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Evening product
      repo._store.set("750e8400-e29b-41d4-a716-446655440003", {
        id: "750e8400-e29b-41d4-a716-446655440003",
        userProfileId: user1Id,
        routineStep: "Cleanser",
        productName: "Evening 1",
        instructions: "Apply",
        frequency: "Daily",
        timeOfDay: "evening",
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const deps: RoutineProductDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      // Reorder only morning products
      const result = await reorderRoutineProducts(
        user1Id,
        "morning",
        ["750e8400-e29b-41d4-a716-446655440002", "750e8400-e29b-41d4-a716-446655440001"],
        deps
      );

      expect(result.success).toBe(true);
      // Morning products reordered
      expect(repo._store.get("750e8400-e29b-41d4-a716-446655440002")!.order).toBe(0);
      expect(repo._store.get("750e8400-e29b-41d4-a716-446655440001")!.order).toBe(1);
      // Evening product unchanged
      expect(repo._store.get("750e8400-e29b-41d4-a716-446655440003")!.order).toBe(0);
    });

    it("updates updatedAt for all reordered products", async () => {
      const repo = makeRoutineProductsRepoFake();

      const oldTimestamp = new Date("2024-01-01");

      repo._store.set(product1Id, {
        id: product1Id,
        userProfileId: user1Id,
        routineStep: "Cleanser",
        productName: "Product 1",
        instructions: "Apply",
        frequency: "Daily",
        timeOfDay: "morning",
        order: 0,
        createdAt: new Date(),
        updatedAt: oldTimestamp,
      });

      repo._store.set(product2Id, {
        id: product2Id,
        userProfileId: user1Id,
        routineStep: "Serum",
        productName: "Product 2",
        instructions: "Apply",
        frequency: "Daily",
        timeOfDay: "morning",
        order: 1,
        createdAt: new Date(),
        updatedAt: oldTimestamp,
      });

      const fixedNow = new Date("2025-01-15T10:30:00Z");
      const deps: RoutineProductDeps = {
        repo,
        now: () => fixedNow
        
      };

      const result = await reorderRoutineProducts(
        user1Id,
        "morning",
        [product2Id, product1Id],
        deps
      );

      expect(result.success).toBe(true);
      expect(repo._store.get(product1Id)!.updatedAt).toEqual(fixedNow);
      expect(repo._store.get(product2Id)!.updatedAt).toEqual(fixedNow);
    });

    it("returns error when userId is invalid format", async () => {
      const deps: RoutineProductDeps = {
        repo: makeRoutineProductsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await reorderRoutineProducts("invalid-id", "morning", [product1Id], deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when productIds array is empty", async () => {
      const deps: RoutineProductDeps = {
        repo: makeRoutineProductsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await reorderRoutineProducts(user1Id, "morning", [], deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });
  });

  describe("Error Handling", () => {
    it("createRoutineProduct handles repository errors", async () => {
      const repo = makeRoutineProductsRepoFake();
      repo.create = async () => {
        throw new Error("Database connection failed");
      };

      const deps: RoutineProductDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
      };

      const data = {
        routineStep: "Cleanser",
        productName: "Test Product",
        instructions: "Apply to damp skin",
        frequency: "Daily",
        timeOfDay: "morning" as const,
      };

      const result = await createRoutineProduct(user1Id, data, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to create routine product");
      }
    });

    it("getRoutineProducts handles repository errors", async () => {
      const repo = makeRoutineProductsRepoFake();
      repo.findByUserId = async () => {
        throw new Error("Database connection failed");
      };

      const deps: RoutineProductDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
      };

      const result = await getRoutineProducts(user1Id, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to fetch routine products");
      }
    });

    it("getRoutineProductsByTimeOfDay handles repository errors", async () => {
      const repo = makeRoutineProductsRepoFake();
      repo.findByUserIdAndTimeOfDay = async () => {
        throw new Error("Database connection failed");
      };

      const deps: RoutineProductDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
      };

      const result = await getRoutineProductsByTimeOfDay(user1Id, "morning", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to fetch routine products");
      }
    });

    it("updateRoutineProduct handles repository errors", async () => {
      const repo = makeRoutineProductsRepoFake();
      repo.update = async () => {
        throw new Error("Database connection failed");
      };

      const deps: RoutineProductDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
      };

      const result = await updateRoutineProduct(product1Id, { productName: "Updated" }, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to update routine product");
      }
    });

    it("deleteRoutineProduct handles repository errors", async () => {
      const repo = makeRoutineProductsRepoFake();
      repo.deleteById = async () => {
        throw new Error("Database connection failed");
      };

      const deps: RoutineProductDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
      };

      const result = await deleteRoutineProduct(product1Id, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to delete routine product");
      }
    });

    it("reorderRoutineProducts handles repository errors", async () => {
      const repo = makeRoutineProductsRepoFake();
      repo.updateMany = async () => {
        throw new Error("Database connection failed");
      };

      const deps: RoutineProductDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
      };

      const result = await reorderRoutineProducts(user1Id, "morning", [product1Id, product2Id], deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to reorder routine products");
      }
    });
  });
});

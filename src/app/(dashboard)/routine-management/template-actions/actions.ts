"use server";

import { z } from "zod";
import { makeTemplateRepo } from "./template.repo";
import type {
  RoutineTemplate,
  NewRoutineTemplate,
  RoutineTemplateProduct,
  NewRoutineTemplateProduct,
} from "./template.repo.fake";

// Dependency injection for testing (follows TESTING.md)
export type TemplateDeps = {
  repo: ReturnType<typeof makeTemplateRepo>;
  now: () => Date;
};

// Default dependencies (production)
const defaultDeps: TemplateDeps = {
  repo: makeTemplateRepo(),
  now: () => new Date(),
};

// Result types
type SuccessResult<T> = { success: true; data: T };
type ErrorResult = { success: false; error: string };
type Result<T> = SuccessResult<T> | ErrorResult;

// Input types
export type CreateTemplateInput = {
  name: string;
  description?: string | null;
};

export type UpdateTemplateInput = {
  name?: string;
  description?: string | null;
};

export type CreateTemplateProductInput = {
  routineStep: string;
  productName: string;
  productUrl?: string | null;
  instructions?: string | null;
  frequency: string;
  days?: string[] | null;
  timeOfDay: "morning" | "evening";
};

export type UpdateTemplateProductInput = {
  routineStep?: string;
  productName?: string;
  productUrl?: string | null;
  instructions?: string | null;
  frequency?: string;
  days?: string[] | null;
};

// Zod schemas for validation
const uuidSchema = z.string().uuid();
const requiredStringSchema = z.string().trim().min(1);

const createTemplateSchema = z.object({
  adminId: uuidSchema,
  name: requiredStringSchema,
  description: z.string().nullable().optional(),
});

const updateTemplateSchema = z.object({
  templateId: uuidSchema,
  name: requiredStringSchema.optional(),
  description: z.string().nullable().optional(),
});

const deleteTemplateSchema = z.object({
  templateId: uuidSchema,
});

/**
 * Get all templates
 */
export async function getTemplates(
  deps: TemplateDeps = defaultDeps,
): Promise<Result<RoutineTemplate[]>> {
  const { repo } = deps;

  try {
    const templates = await repo.findAll();
    return { success: true, data: templates };
  } catch (error) {
    console.error("Error fetching templates:", error);
    return { success: false, error: "Failed to fetch templates" };
  }
}

/**
 * Get a single template by ID
 */
export async function getTemplate(
  templateId: string,
  deps: TemplateDeps = defaultDeps,
): Promise<Result<RoutineTemplate>> {
  const { repo } = deps;

  // Validate templateId with Zod
  const validation = uuidSchema.safeParse(templateId);
  if (!validation.success) {
    return { success: false, error: "Invalid template ID" };
  }

  try {
    const template = await repo.findById(validation.data);

    if (!template) {
      return { success: false, error: "Template not found" };
    }

    return { success: true, data: template };
  } catch (error) {
    console.error("Error fetching template:", error);
    return { success: false, error: "Failed to fetch template" };
  }
}

/**
 * Create a new template
 */
export async function createTemplate(
  adminId: string,
  input: CreateTemplateInput,
  deps: TemplateDeps = defaultDeps,
): Promise<Result<RoutineTemplate>> {
  const { repo, now } = deps;

  // Validate input with Zod
  const validation = createTemplateSchema.safeParse({
    adminId,
    name: input.name,
    description: input.description,
  });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    const timestamp = now();

    const newTemplate: NewRoutineTemplate = {
      name: validation.data.name,
      description: validation.data.description || null,
      createdBy: validation.data.adminId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const template = await repo.create(newTemplate);
    return { success: true, data: template };
  } catch (error) {
    console.error("Error creating template:", error);
    return { success: false, error: "Failed to create template" };
  }
}

/**
 * Update an existing template
 */
export async function updateTemplate(
  templateId: string,
  updates: UpdateTemplateInput,
  deps: TemplateDeps = defaultDeps,
): Promise<Result<RoutineTemplate>> {
  const { repo, now } = deps;

  // Validate input with Zod
  const validation = updateTemplateSchema.safeParse({
    templateId,
    ...updates,
  });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    // Build update data with validated fields
    const updateData: Partial<RoutineTemplate> = {
      updatedAt: now(),
    };

    if (validation.data.name !== undefined) {
      updateData.name = validation.data.name;
    }

    if (validation.data.description !== undefined) {
      updateData.description = validation.data.description;
    }

    // Update template
    const updatedTemplate = await repo.update(
      validation.data.templateId,
      updateData,
    );

    if (!updatedTemplate) {
      return { success: false, error: "Template not found" };
    }

    return { success: true, data: updatedTemplate };
  } catch (error) {
    console.error("Error updating template:", error);
    return { success: false, error: "Failed to update template" };
  }
}

/**
 * Delete a template (cascades to delete all template products)
 */
export async function deleteTemplate(
  templateId: string,
  deps: TemplateDeps = defaultDeps,
): Promise<Result<void>> {
  const { repo } = deps;

  // Validate input with Zod
  const validation = deleteTemplateSchema.safeParse({ templateId });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    // Delete template
    const deletedTemplate = await repo.deleteById(validation.data.templateId);

    if (!deletedTemplate) {
      return { success: false, error: "Template not found" };
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error deleting template:", error);
    return { success: false, error: "Failed to delete template" };
  }
}

/**
 * Get all products for a template
 */
export async function getTemplateProducts(
  templateId: string,
  deps: TemplateDeps = defaultDeps,
): Promise<Result<RoutineTemplateProduct[]>> {
  const { repo } = deps;

  // Validate templateId with Zod
  const validation = uuidSchema.safeParse(templateId);
  if (!validation.success) {
    return { success: false, error: "Invalid template ID" };
  }

  try {
    const products = await repo.findProductsByTemplateId(validation.data);
    return { success: true, data: products };
  } catch (error) {
    console.error("Error fetching template products:", error);
    return { success: false, error: "Failed to fetch template products" };
  }
}

// Zod schemas for template products
const createTemplateProductSchema = z.object({
  templateId: uuidSchema,
  routineStep: requiredStringSchema,
  productName: requiredStringSchema,
  productUrl: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : val),
    z.string().url().nullable().optional(),
  ),
  instructions: z.string().optional(),
  frequency: z.enum([
    "daily",
    "1x per week",
    "2x per week",
    "3x per week",
    "4x per week",
    "5x per week",
    "6x per week",
    "specific_days",
  ]),
  days: z.array(z.string()).nullable().optional(),
  timeOfDay: z.enum(["morning", "evening"]),
});

const updateTemplateProductSchema = z.object({
  productId: uuidSchema,
  routineStep: requiredStringSchema.optional(),
  productName: requiredStringSchema.optional(),
  productUrl: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : val),
    z.string().url().nullable().optional(),
  ),
  instructions: requiredStringSchema.optional(),
  frequency: z
    .enum([
      "daily",
      "1x per week",
      "2x per week",
      "3x per week",
      "4x per week",
      "5x per week",
      "6x per week",
      "specific_days",
    ])
    .optional(),
  days: z.array(z.string()).nullable().optional(),
});

const deleteTemplateProductSchema = z.object({
  productId: uuidSchema,
});

const reorderTemplateProductsSchema = z.object({
  templateId: uuidSchema,
  timeOfDay: z.enum(["morning", "evening"]),
  productIds: z.array(uuidSchema),
});

/**
 * Create a new template product
 */
export async function createTemplateProduct(
  templateId: string,
  input: CreateTemplateProductInput,
  deps: TemplateDeps = defaultDeps,
): Promise<Result<RoutineTemplateProduct>> {
  const { repo, now } = deps;

  // Validate input with Zod
  const validation = createTemplateProductSchema.safeParse({
    templateId,
    routineStep: input.routineStep,
    productName: input.productName,
    productUrl: input.productUrl,
    instructions: input.instructions,
    frequency: input.frequency,
    days: input.days,
    timeOfDay: input.timeOfDay,
  });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    // Verify template exists
    const template = await repo.findById(validation.data.templateId);
    if (!template) {
      return { success: false, error: "Template not found" };
    }

    // Get existing products to determine order
    const existingProducts = await repo.findProductsByTemplateId(
      validation.data.templateId,
    );
    const sameTimeOfDayProducts = existingProducts.filter(
      (p) => p.timeOfDay === validation.data.timeOfDay,
    );
    const order = sameTimeOfDayProducts.length;

    const timestamp = now();

    const newProduct: NewRoutineTemplateProduct = {
      templateId: validation.data.templateId,
      routineStep: validation.data.routineStep,
      productName: validation.data.productName,
      productUrl: validation.data.productUrl || null,
      instructions: validation.data.instructions || null,
      frequency: validation.data.frequency,
      days: validation.data.days || null,
      timeOfDay: validation.data.timeOfDay,
      order,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const product = await repo.createProduct(newProduct);
    return { success: true, data: product };
  } catch (error) {
    console.error("Error creating template product:", error);
    return { success: false, error: "Failed to create template product" };
  }
}

/**
 * Update an existing template product
 */
export async function updateTemplateProduct(
  productId: string,
  updates: UpdateTemplateProductInput,
  deps: TemplateDeps = defaultDeps,
): Promise<Result<RoutineTemplateProduct>> {
  const { repo, now } = deps;

  // Validate input with Zod
  const validation = updateTemplateProductSchema.safeParse({
    productId,
    ...updates,
  });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    // Build update data with validated fields
    const updateData: Partial<RoutineTemplateProduct> = {
      updatedAt: now(),
    };

    if (validation.data.routineStep !== undefined) {
      updateData.routineStep = validation.data.routineStep;
    }

    if (validation.data.productName !== undefined) {
      updateData.productName = validation.data.productName;
    }

    if (validation.data.productUrl !== undefined) {
      updateData.productUrl = validation.data.productUrl;
    }

    if (validation.data.instructions !== undefined) {
      updateData.instructions = validation.data.instructions;
    }

    if (validation.data.frequency !== undefined) {
      updateData.frequency = validation.data.frequency;
    }

    if (validation.data.days !== undefined) {
      updateData.days = validation.data.days;
    }

    // Update product
    const updatedProduct = await repo.updateProduct(
      validation.data.productId,
      updateData,
    );

    if (!updatedProduct) {
      return { success: false, error: "Template product not found" };
    }

    return { success: true, data: updatedProduct };
  } catch (error) {
    console.error("Error updating template product:", error);
    return { success: false, error: "Failed to update template product" };
  }
}

/**
 * Delete a template product
 */
export async function deleteTemplateProduct(
  productId: string,
  deps: TemplateDeps = defaultDeps,
): Promise<Result<void>> {
  const { repo } = deps;

  // Validate input with Zod
  const validation = deleteTemplateProductSchema.safeParse({ productId });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    // Delete product
    const deletedProduct = await repo.deleteProductById(
      validation.data.productId,
    );

    if (!deletedProduct) {
      return { success: false, error: "Template product not found" };
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error deleting template product:", error);
    return { success: false, error: "Failed to delete template product" };
  }
}

/**
 * Reorder template products for a specific time of day
 */
export async function reorderTemplateProducts(
  templateId: string,
  timeOfDay: "morning" | "evening",
  productIds: string[],
  deps: TemplateDeps = defaultDeps,
): Promise<Result<void>> {
  const { repo, now } = deps;

  // Validate input with Zod
  const validation = reorderTemplateProductsSchema.safeParse({
    templateId,
    timeOfDay,
    productIds,
  });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    const timestamp = now();

    // Build updates for each product
    const updates = validation.data.productIds.map((productId, index) => ({
      id: productId,
      data: {
        order: index,
        updatedAt: timestamp,
      },
    }));

    // Update all products in batch
    await repo.updateManyProducts(updates);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error reordering template products:", error);
    return { success: false, error: "Failed to reorder template products" };
  }
}

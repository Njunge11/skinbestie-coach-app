import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@/test/utils";
import userEvent from "@testing-library/user-event";
import { TemplateList } from "./template-list";

// Mock server actions at network boundary
vi.mock("../template-actions/actions", () => ({
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  createTemplateProduct: vi.fn(),
  updateTemplateProduct: vi.fn(),
  deleteTemplateProduct: vi.fn(),
  reorderTemplateProducts: vi.fn(),
}));

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe("TemplateList", () => {
  it("user sees empty state with create button", async () => {
    const user = userEvent.setup();
    const onCreateClick = vi.fn();

    render(
      <TemplateList
        templates={[]}
        templateDetails={{}}
        onCreateClick={onCreateClick}
      />
    );

    // User sees empty state message
    expect(screen.getByText("No templates yet")).toBeInTheDocument();
    expect(screen.getByText(/create your first routine template/i)).toBeInTheDocument();

    // User sees Create Template button
    const createButton = screen.getByRole("button", { name: /create template/i });
    expect(createButton).toBeInTheDocument();

    // User clicks Create Template button
    await user.click(createButton);

    // onCreateClick should be called
    expect(onCreateClick).toHaveBeenCalled();
  });

  it("user expands template to see products", async () => {
    const user = userEvent.setup();
    const onCreateClick = vi.fn();

    const templates = [
      {
        id: "template-1",
        name: "Acne Treatment",
        description: "For acne-prone skin",
        morningProducts: 2,
        eveningProducts: 1,
        updatedAt: new Date("2025-01-15"),
        createdAt: new Date("2025-01-10"),
      },
    ];

    const templateDetails = {
      "template-1": {
        morning: [],
        evening: [],
      },
    };

    render(
      <TemplateList
        templates={templates}
        templateDetails={templateDetails}
        onCreateClick={onCreateClick}
      />
    );

    // User sees template name
    expect(screen.getByText("Acne Treatment")).toBeInTheDocument();

    // Products section should not be visible initially
    expect(screen.queryByText("Morning")).not.toBeInTheDocument();

    // User clicks on template to expand
    await user.click(screen.getByText("Acne Treatment"));

    // Products section should now be visible
    expect(screen.getByText("Morning")).toBeInTheDocument();
    expect(screen.getByText("Evening")).toBeInTheDocument();
  });

  it("user collapses expanded template", async () => {
    const user = userEvent.setup();
    const onCreateClick = vi.fn();

    const templates = [
      {
        id: "template-1",
        name: "Acne Treatment",
        description: "For acne-prone skin",
        morningProducts: 2,
        eveningProducts: 1,
        updatedAt: new Date("2025-01-15"),
        createdAt: new Date("2025-01-10"),
      },
    ];

    const templateDetails = {
      "template-1": {
        morning: [],
        evening: [],
      },
    };

    render(
      <TemplateList
        templates={templates}
        templateDetails={templateDetails}
        onCreateClick={onCreateClick}
      />
    );

    // User expands template
    await user.click(screen.getByText("Acne Treatment"));
    expect(screen.getByText("Morning")).toBeInTheDocument();

    // User clicks again to collapse
    await user.click(screen.getByText("Acne Treatment"));

    // Products section should be hidden
    expect(screen.queryByText("Morning")).not.toBeInTheDocument();
  });

  it("user clicks edit button and edit dialog appears", async () => {
    const user = userEvent.setup();
    const onCreateClick = vi.fn();

    const templates = [
      {
        id: "template-1",
        name: "Acne Treatment",
        description: "For acne-prone skin",
        morningProducts: 2,
        eveningProducts: 1,
        updatedAt: new Date("2025-01-15"),
        createdAt: new Date("2025-01-10"),
      },
    ];

    const templateDetails = {
      "template-1": {
        morning: [],
        evening: [],
      },
    };

    render(
      <TemplateList
        templates={templates}
        templateDetails={templateDetails}
        onCreateClick={onCreateClick}
      />
    );

    // User clicks Edit button
    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    await user.click(editButtons[0]);

    // Edit dialog should appear with template name
    expect(screen.getByLabelText(/template name/i)).toHaveValue("Acne Treatment");
  });

  it("user clicks delete button and confirmation dialog appears", async () => {
    const user = userEvent.setup();
    const onCreateClick = vi.fn();

    const templates = [
      {
        id: "template-1",
        name: "Acne Treatment",
        description: "For acne-prone skin",
        morningProducts: 2,
        eveningProducts: 1,
        updatedAt: new Date("2025-01-15"),
        createdAt: new Date("2025-01-10"),
      },
    ];

    const templateDetails = {
      "template-1": {
        morning: [],
        evening: [],
      },
    };

    render(
      <TemplateList
        templates={templates}
        templateDetails={templateDetails}
        onCreateClick={onCreateClick}
      />
    );

    // User clicks Delete button (trash icon) - it's the second button after Edit
    const buttons = screen.getAllByRole("button");
    const deleteButton = buttons.find(btn => btn.querySelector('svg.lucide-trash2'));
    await user.click(deleteButton!);

    // Confirmation dialog should appear
    expect(screen.getByText("Delete Template?")).toBeInTheDocument();
    expect(screen.getByText(/this will permanently delete the template/i)).toBeInTheDocument();
  });

  it("user cancels template deletion", async () => {
    const user = userEvent.setup();
    const onCreateClick = vi.fn();

    const templates = [
      {
        id: "template-1",
        name: "Acne Treatment",
        description: "For acne-prone skin",
        morningProducts: 2,
        eveningProducts: 1,
        updatedAt: new Date("2025-01-15"),
        createdAt: new Date("2025-01-10"),
      },
    ];

    const templateDetails = {
      "template-1": {
        morning: [],
        evening: [],
      },
    };

    render(
      <TemplateList
        templates={templates}
        templateDetails={templateDetails}
        onCreateClick={onCreateClick}
      />
    );

    // User clicks Delete button (trash icon)
    const buttons = screen.getAllByRole("button");
    const deleteButton = buttons.find(btn => btn.querySelector('svg.lucide-trash2'));
    await user.click(deleteButton!);

    // Confirmation dialog appears
    expect(screen.getByText("Delete Template?")).toBeInTheDocument();

    // User clicks Cancel
    const cancelButtons = screen.getAllByRole("button", { name: /cancel/i });
    await user.click(cancelButtons[cancelButtons.length - 1]); // Last cancel button (in dialog)

    // Dialog should close
    expect(screen.queryByText("Delete Template?")).not.toBeInTheDocument();

    // Template should still be visible
    expect(screen.getByText("Acne Treatment")).toBeInTheDocument();
  });

  it("user deletes template successfully", async () => {
    const user = userEvent.setup();
    const onCreateClick = vi.fn();

    const { deleteTemplate } = await import("../template-actions/actions");

    vi.mocked(deleteTemplate).mockResolvedValueOnce({
      success: true,
    });

    const templates = [
      {
        id: "template-1",
        name: "Acne Treatment",
        description: "For acne-prone skin",
        morningProducts: 2,
        eveningProducts: 1,
        updatedAt: new Date("2025-01-15"),
        createdAt: new Date("2025-01-10"),
      },
    ];

    const templateDetails = {
      "template-1": {
        morning: [],
        evening: [],
      },
    };

    render(
      <TemplateList
        templates={templates}
        templateDetails={templateDetails}
        onCreateClick={onCreateClick}
      />
    );

    // User clicks Delete button (trash icon)
    const buttons = screen.getAllByRole("button");
    const deleteButton = buttons.find(btn => btn.querySelector('svg.lucide-trash2'));
    await user.click(deleteButton!);

    // Confirmation dialog appears
    expect(screen.getByText("Delete Template?")).toBeInTheDocument();

    // User confirms deletion
    const deleteConfirmButton = screen.getByRole("button", { name: /delete template/i });
    await user.click(deleteConfirmButton);

    // Server action called
    await waitFor(() => {
      expect(deleteTemplate).toHaveBeenCalledWith("template-1");
    });
  });

  it("user sees error when template deletion fails", async () => {
    const user = userEvent.setup();
    const onCreateClick = vi.fn();

    const { deleteTemplate } = await import("../template-actions/actions");
    const { toast } = await import("sonner");

    vi.mocked(deleteTemplate).mockResolvedValueOnce({
      success: false,
      error: "Failed to delete template",
    });

    const templates = [
      {
        id: "template-1",
        name: "Acne Treatment",
        description: "For acne-prone skin",
        morningProducts: 2,
        eveningProducts: 1,
        updatedAt: new Date("2025-01-15"),
        createdAt: new Date("2025-01-10"),
      },
    ];

    const templateDetails = {
      "template-1": {
        morning: [],
        evening: [],
      },
    };

    render(
      <TemplateList
        templates={templates}
        templateDetails={templateDetails}
        onCreateClick={onCreateClick}
      />
    );

    // User clicks Delete button (trash icon)
    const buttons = screen.getAllByRole("button");
    const deleteButton = buttons.find(btn => btn.querySelector('svg.lucide-trash2'));
    await user.click(deleteButton!);

    // User confirms deletion
    const deleteConfirmButton = screen.getByRole("button", { name: /delete template/i });
    await user.click(deleteConfirmButton);

    // Server action called
    await waitFor(() => {
      expect(deleteTemplate).toHaveBeenCalledWith("template-1");
    });

    // Error toast shown
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to delete template");
    });
  });

  it("user updates template successfully", async () => {
    const user = userEvent.setup();
    const onCreateClick = vi.fn();

    const { updateTemplate } = await import("../template-actions/actions");

    vi.mocked(updateTemplate).mockResolvedValueOnce({
      success: true,
      data: {
        id: "template-1",
        name: "Updated Treatment",
        description: "Updated description",
      },
    });

    const templates = [
      {
        id: "template-1",
        name: "Acne Treatment",
        description: "For acne-prone skin",
        morningProducts: 2,
        eveningProducts: 1,
        updatedAt: new Date("2025-01-15"),
        createdAt: new Date("2025-01-10"),
      },
    ];

    const templateDetails = {
      "template-1": {
        morning: [],
        evening: [],
      },
    };

    render(
      <TemplateList
        templates={templates}
        templateDetails={templateDetails}
        onCreateClick={onCreateClick}
      />
    );

    // User clicks Edit button
    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    await user.click(editButtons[0]);

    // Edit dialog appears - user updates name
    const nameInput = screen.getByLabelText(/template name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Treatment");

    // User updates description
    const descInput = screen.getByLabelText(/description/i);
    await user.clear(descInput);
    await user.type(descInput, "Updated description");

    // User saves changes
    const saveButton = screen.getByRole("button", { name: /save changes/i });
    await user.click(saveButton);

    // Server action called
    await waitFor(() => {
      expect(updateTemplate).toHaveBeenCalledWith("template-1", {
        name: "Updated Treatment",
        description: "Updated description",
      });
    });
  });

  it("user sees error when template update fails", async () => {
    const user = userEvent.setup();
    const onCreateClick = vi.fn();

    const { updateTemplate } = await import("../template-actions/actions");
    const { toast } = await import("sonner");

    vi.mocked(updateTemplate).mockResolvedValueOnce({
      success: false,
      error: "Failed to update template",
    });

    const templates = [
      {
        id: "template-1",
        name: "Acne Treatment",
        description: "For acne-prone skin",
        morningProducts: 2,
        eveningProducts: 1,
        updatedAt: new Date("2025-01-15"),
        createdAt: new Date("2025-01-10"),
      },
    ];

    const templateDetails = {
      "template-1": {
        morning: [],
        evening: [],
      },
    };

    render(
      <TemplateList
        templates={templates}
        templateDetails={templateDetails}
        onCreateClick={onCreateClick}
      />
    );

    // User clicks Edit button
    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    await user.click(editButtons[0]);

    // User updates name and saves
    const nameInput = screen.getByLabelText(/template name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Treatment");

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    await user.click(saveButton);

    // Server action called
    await waitFor(() => {
      expect(updateTemplate).toHaveBeenCalled();
    });

    // Error toast shown
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to update template");
    });
  });

  it("user updates morning product successfully", async () => {
    const user = userEvent.setup();
    const onCreateClick = vi.fn();

    const { updateTemplateProduct } = await import("../template-actions/actions");

    vi.mocked(updateTemplateProduct).mockResolvedValueOnce({
      success: true,
      data: { id: "product-1", routineStep: "Cleanser", productName: "Updated Cleanser" },
    });

    const templates = [
      {
        id: "template-1",
        name: "Acne Treatment",
        description: "For acne-prone skin",
        morningProducts: 1,
        eveningProducts: 0,
        updatedAt: new Date("2025-01-15"),
        createdAt: new Date("2025-01-10"),
      },
    ];

    const templateDetails = {
      "template-1": {
        morning: [
          {
            id: "product-1",
            routineStep: "Cleanser",
            productName: "Gentle Cleanser",
            productUrl: null,
            instructions: "Apply to damp skin",
            frequency: "Daily",
            days: undefined,
          },
        ],
        evening: [],
      },
    };

    render(
      <TemplateList
        templates={templates}
        templateDetails={templateDetails}
        onCreateClick={onCreateClick}
      />
    );

    // User expands template
    await user.click(screen.getByText("Acne Treatment"));

    // User sees morning product
    expect(screen.getByText("Gentle Cleanser")).toBeInTheDocument();

    // ProductItem has an edit button/click - clicking the product itself should trigger edit
    // Based on ProductItem component, clicking the product opens edit mode
    await user.click(screen.getByText("Gentle Cleanser"));

    // User should see edit form
    const productNameInput = screen.getByPlaceholderText(/product name/i);
    await user.clear(productNameInput);
    await user.type(productNameInput, "Updated Cleanser");

    // User clicks Save
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Server action called
    await waitFor(() => {
      expect(updateTemplateProduct).toHaveBeenCalledWith("product-1", expect.objectContaining({
        productName: "Updated Cleanser",
      }));
    });
  });

  it("user sees error when updating morning product fails", async () => {
    const user = userEvent.setup();
    const onCreateClick = vi.fn();

    const { updateTemplateProduct } = await import("../template-actions/actions");
    const { toast } = await import("sonner");

    vi.mocked(updateTemplateProduct).mockResolvedValueOnce({
      success: false,
      error: "Failed to update product",
    });

    const templates = [
      {
        id: "template-1",
        name: "Acne Treatment",
        description: "For acne-prone skin",
        morningProducts: 1,
        eveningProducts: 0,
        updatedAt: new Date("2025-01-15"),
        createdAt: new Date("2025-01-10"),
      },
    ];

    const templateDetails = {
      "template-1": {
        morning: [
          {
            id: "product-1",
            routineStep: "Cleanser",
            productName: "Gentle Cleanser",
            productUrl: null,
            instructions: "Apply to damp skin",
            frequency: "Daily",
            days: undefined,
          },
        ],
        evening: [],
      },
    };

    render(
      <TemplateList
        templates={templates}
        templateDetails={templateDetails}
        onCreateClick={onCreateClick}
      />
    );

    // User expands template
    await user.click(screen.getByText("Acne Treatment"));

    // User clicks product to edit
    await user.click(screen.getByText("Gentle Cleanser"));

    // User makes changes and saves
    const productNameInput = screen.getByPlaceholderText(/product name/i);
    await user.clear(productNameInput);
    await user.type(productNameInput, "Updated Cleanser");
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Server action called
    await waitFor(() => {
      expect(updateTemplateProduct).toHaveBeenCalled();
    });

    // Error toast shown
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to update product");
    });
  });

  it("user deletes morning product successfully", async () => {
    const user = userEvent.setup();
    const onCreateClick = vi.fn();

    const { deleteTemplateProduct } = await import("../template-actions/actions");

    vi.mocked(deleteTemplateProduct).mockResolvedValueOnce({
      success: true,
    });

    const templates = [
      {
        id: "template-1",
        name: "Acne Treatment",
        description: "For acne-prone skin",
        morningProducts: 1,
        eveningProducts: 0,
        updatedAt: new Date("2025-01-15"),
        createdAt: new Date("2025-01-10"),
      },
    ];

    const templateDetails = {
      "template-1": {
        morning: [
          {
            id: "product-1",
            routineStep: "Cleanser",
            productName: "Gentle Cleanser",
            productUrl: null,
            instructions: "Apply to damp skin",
            frequency: "Daily",
            days: undefined,
          },
        ],
        evening: [],
      },
    };

    render(
      <TemplateList
        templates={templates}
        templateDetails={templateDetails}
        onCreateClick={onCreateClick}
      />
    );

    // User expands template
    await user.click(screen.getByText("Acne Treatment"));

    // User clicks delete button on product
    const deleteButton = screen.getByRole("button", { name: /delete step/i });
    await user.click(deleteButton);

    // Server action called
    await waitFor(() => {
      expect(deleteTemplateProduct).toHaveBeenCalledWith("product-1");
    });
  });

  it("user sees error when deleting morning product fails", async () => {
    const user = userEvent.setup();
    const onCreateClick = vi.fn();

    const { deleteTemplateProduct } = await import("../template-actions/actions");
    const { toast } = await import("sonner");

    vi.mocked(deleteTemplateProduct).mockResolvedValueOnce({
      success: false,
      error: "Failed to delete product",
    });

    const templates = [
      {
        id: "template-1",
        name: "Acne Treatment",
        description: "For acne-prone skin",
        morningProducts: 1,
        eveningProducts: 0,
        updatedAt: new Date("2025-01-15"),
        createdAt: new Date("2025-01-10"),
      },
    ];

    const templateDetails = {
      "template-1": {
        morning: [
          {
            id: "product-1",
            routineStep: "Cleanser",
            productName: "Gentle Cleanser",
            productUrl: null,
            instructions: "Apply to damp skin",
            frequency: "Daily",
            days: undefined,
          },
        ],
        evening: [],
      },
    };

    render(
      <TemplateList
        templates={templates}
        templateDetails={templateDetails}
        onCreateClick={onCreateClick}
      />
    );

    // User expands template
    await user.click(screen.getByText("Acne Treatment"));

    // User clicks delete button
    await user.click(screen.getByRole("button", { name: /delete step/i }));

    // Server action called
    await waitFor(() => {
      expect(deleteTemplateProduct).toHaveBeenCalledWith("product-1");
    });

    // Error toast shown
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to delete product");
    });
  });

  it("user updates evening product successfully", async () => {
    const user = userEvent.setup();
    const onCreateClick = vi.fn();

    const { updateTemplateProduct } = await import("../template-actions/actions");

    vi.mocked(updateTemplateProduct).mockResolvedValueOnce({
      success: true,
      data: { id: "product-2", routineStep: "Moisturizer / Cream", productName: "Updated Moisturizer" },
    });

    const templates = [
      {
        id: "template-1",
        name: "Acne Treatment",
        description: "For acne-prone skin",
        morningProducts: 0,
        eveningProducts: 1,
        updatedAt: new Date("2025-01-15"),
        createdAt: new Date("2025-01-10"),
      },
    ];

    const templateDetails = {
      "template-1": {
        morning: [],
        evening: [
          {
            id: "product-2",
            routineStep: "Moisturizer / Cream",
            productName: "Night Cream",
            productUrl: null,
            instructions: "Apply before bed",
            frequency: "Daily",
            days: undefined,
          },
        ],
      },
    };

    render(
      <TemplateList
        templates={templates}
        templateDetails={templateDetails}
        onCreateClick={onCreateClick}
      />
    );

    // User expands template
    await user.click(screen.getByText("Acne Treatment"));

    // User clicks evening product to edit
    await user.click(screen.getByText("Night Cream"));

    // User updates product
    const productNameInput = screen.getByPlaceholderText(/product name/i);
    await user.clear(productNameInput);
    await user.type(productNameInput, "Updated Moisturizer");

    // User saves
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Server action called
    await waitFor(() => {
      expect(updateTemplateProduct).toHaveBeenCalledWith("product-2", expect.objectContaining({
        productName: "Updated Moisturizer",
      }));
    });
  });

  it("user sees error when updating evening product fails", async () => {
    const user = userEvent.setup();
    const onCreateClick = vi.fn();

    const { updateTemplateProduct } = await import("../template-actions/actions");
    const { toast } = await import("sonner");

    vi.mocked(updateTemplateProduct).mockResolvedValueOnce({
      success: false,
      error: "Failed to update evening product",
    });

    const templates = [
      {
        id: "template-1",
        name: "Acne Treatment",
        description: "For acne-prone skin",
        morningProducts: 0,
        eveningProducts: 1,
        updatedAt: new Date("2025-01-15"),
        createdAt: new Date("2025-01-10"),
      },
    ];

    const templateDetails = {
      "template-1": {
        morning: [],
        evening: [
          {
            id: "product-2",
            routineStep: "Moisturizer / Cream",
            productName: "Night Cream",
            productUrl: null,
            instructions: "Apply before bed",
            frequency: "Daily",
            days: undefined,
          },
        ],
      },
    };

    render(
      <TemplateList
        templates={templates}
        templateDetails={templateDetails}
        onCreateClick={onCreateClick}
      />
    );

    // User expands template and edits evening product
    await user.click(screen.getByText("Acne Treatment"));
    await user.click(screen.getByText("Night Cream"));

    const productNameInput = screen.getByPlaceholderText(/product name/i);
    await user.clear(productNameInput);
    await user.type(productNameInput, "Updated Moisturizer");
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Server action called
    await waitFor(() => {
      expect(updateTemplateProduct).toHaveBeenCalled();
    });

    // Error toast shown
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to update evening product");
    });
  });

  it("user deletes evening product successfully", async () => {
    const user = userEvent.setup();
    const onCreateClick = vi.fn();

    const { deleteTemplateProduct } = await import("../template-actions/actions");

    vi.mocked(deleteTemplateProduct).mockResolvedValueOnce({
      success: true,
    });

    const templates = [
      {
        id: "template-1",
        name: "Acne Treatment",
        description: "For acne-prone skin",
        morningProducts: 0,
        eveningProducts: 1,
        updatedAt: new Date("2025-01-15"),
        createdAt: new Date("2025-01-10"),
      },
    ];

    const templateDetails = {
      "template-1": {
        morning: [],
        evening: [
          {
            id: "product-2",
            routineStep: "Moisturizer / Cream",
            productName: "Night Cream",
            productUrl: null,
            instructions: "Apply before bed",
            frequency: "Daily",
            days: undefined,
          },
        ],
      },
    };

    render(
      <TemplateList
        templates={templates}
        templateDetails={templateDetails}
        onCreateClick={onCreateClick}
      />
    );

    // User expands template
    await user.click(screen.getByText("Acne Treatment"));

    // User deletes evening product
    await user.click(screen.getByRole("button", { name: /delete step/i }));

    // Server action called
    await waitFor(() => {
      expect(deleteTemplateProduct).toHaveBeenCalledWith("product-2");
    });
  });

  it("user sees error when deleting evening product fails", async () => {
    const user = userEvent.setup();
    const onCreateClick = vi.fn();

    const { deleteTemplateProduct } = await import("../template-actions/actions");
    const { toast } = await import("sonner");

    vi.mocked(deleteTemplateProduct).mockResolvedValueOnce({
      success: false,
      error: "Failed to delete evening product",
    });

    const templates = [
      {
        id: "template-1",
        name: "Acne Treatment",
        description: "For acne-prone skin",
        morningProducts: 0,
        eveningProducts: 1,
        updatedAt: new Date("2025-01-15"),
        createdAt: new Date("2025-01-10"),
      },
    ];

    const templateDetails = {
      "template-1": {
        morning: [],
        evening: [
          {
            id: "product-2",
            routineStep: "Moisturizer / Cream",
            productName: "Night Cream",
            productUrl: null,
            instructions: "Apply before bed",
            frequency: "Daily",
            days: undefined,
          },
        ],
      },
    };

    render(
      <TemplateList
        templates={templates}
        templateDetails={templateDetails}
        onCreateClick={onCreateClick}
      />
    );

    // User expands template and deletes evening product
    await user.click(screen.getByText("Acne Treatment"));
    await user.click(screen.getByRole("button", { name: /delete step/i }));

    // Server action called
    await waitFor(() => {
      expect(deleteTemplateProduct).toHaveBeenCalledWith("product-2");
    });

    // Error toast shown
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to delete evening product");
    });
  });

});

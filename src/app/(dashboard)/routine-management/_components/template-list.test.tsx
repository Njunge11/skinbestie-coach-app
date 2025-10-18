import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/utils";
import userEvent from "@testing-library/user-event";
import { TemplateList } from "./template-list";

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
});

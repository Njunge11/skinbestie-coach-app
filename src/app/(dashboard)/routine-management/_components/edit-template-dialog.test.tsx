import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/utils";
import userEvent from "@testing-library/user-event";
import { EditTemplateDialog } from "./edit-template-dialog";

describe("EditTemplateDialog", () => {
  it("user edits template name and description", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    const template = {
      id: "template-1",
      name: "Original Name",
      description: "Original Description",
    };

    render(
      <EditTemplateDialog
        open={true}
        onOpenChange={onOpenChange}
        template={template}
        onUpdate={onUpdate}
      />
    );

    // User should see pre-filled values
    const nameInput = screen.getByLabelText(/template name/i);
    expect(nameInput).toHaveValue("Original Name");

    const descriptionInput = screen.getByLabelText(/description/i);
    expect(descriptionInput).toHaveValue("Original Description");

    // User changes the name
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Name");

    // User changes the description
    await user.clear(descriptionInput);
    await user.type(descriptionInput, "Updated Description");

    // User clicks Save Changes
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    // onUpdate was called with correct data
    expect(onUpdate).toHaveBeenCalledWith({
      name: "Updated Name",
      description: "Updated Description",
    });

    // Dialog should close
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("user clears template description", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    const template = {
      id: "template-1",
      name: "Template Name",
      description: "Original Description",
    };

    render(
      <EditTemplateDialog
        open={true}
        onOpenChange={onOpenChange}
        template={template}
        onUpdate={onUpdate}
      />
    );

    // User clears the description
    const descriptionInput = screen.getByLabelText(/description/i);
    await user.clear(descriptionInput);

    // User clicks Save Changes
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    // onUpdate was called with null description
    expect(onUpdate).toHaveBeenCalledWith({
      name: "Template Name",
      description: null,
    });

    // Dialog should close
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("user cannot save empty template name", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    const template = {
      id: "template-1",
      name: "Original Name",
      description: null,
    };

    render(
      <EditTemplateDialog
        open={true}
        onOpenChange={onOpenChange}
        template={template}
        onUpdate={onUpdate}
      />
    );

    // User clears the name
    const nameInput = screen.getByLabelText(/template name/i);
    await user.clear(nameInput);

    // Save button should be disabled
    const saveButton = screen.getByRole("button", { name: /save changes/i });
    expect(saveButton).toBeDisabled();

    // User types whitespace only
    await user.type(nameInput, "   ");

    // Button should still be disabled
    expect(saveButton).toBeDisabled();

    // onUpdate should not have been called
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("user sees loading state during save", async () => {
    const user = userEvent.setup();
    let resolveUpdate: () => void;
    const onUpdate = vi.fn().mockImplementation(
      () => new Promise<void>((resolve) => {
        resolveUpdate = resolve;
      })
    );
    const onOpenChange = vi.fn();

    const template = {
      id: "template-1",
      name: "Original Name",
      description: "Original Description",
    };

    render(
      <EditTemplateDialog
        open={true}
        onOpenChange={onOpenChange}
        template={template}
        onUpdate={onUpdate}
      />
    );

    // User clicks Save Changes
    const saveButton = screen.getByRole("button", { name: /save changes/i });
    await user.click(saveButton);

    // Button should show loading state
    expect(screen.getByRole("button", { name: /saving\.\.\./i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /saving\.\.\./i })).toBeDisabled();

    // Resolve the update
    resolveUpdate!();

    // Wait for loading state to disappear
    await screen.findByRole("button", { name: /save changes/i });
  });

  it("user cancels editing", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    const template = {
      id: "template-1",
      name: "Original Name",
      description: "Original Description",
    };

    render(
      <EditTemplateDialog
        open={true}
        onOpenChange={onOpenChange}
        template={template}
        onUpdate={onUpdate}
      />
    );

    // User makes changes
    const nameInput = screen.getByLabelText(/template name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Changed Name");

    // User clicks Cancel
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    // Dialog should close without updating
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onUpdate).not.toHaveBeenCalled();
  });
});

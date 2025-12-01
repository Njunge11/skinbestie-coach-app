import { describe, it, expect, vi } from "vitest";
import { render, screen, setupUser } from "@/test/utils";
import { CreateTemplateDialog } from "./create-template-dialog";

describe("CreateTemplateDialog", () => {
  it("user creates template with name and description", async () => {
    const user = setupUser();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    render(
      <CreateTemplateDialog
        open={true}
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
      />,
    );

    // User fills in template name
    const nameInput = screen.getByLabelText(/template name/i);
    await user.type(nameInput, "Acne Treatment Routine");

    // User fills in description
    const descriptionInput = screen.getByLabelText(/description/i);
    await user.type(descriptionInput, "For acne-prone skin");

    // User clicks Create Template button
    await user.click(screen.getByRole("button", { name: /create template/i }));

    // onSubmit was called with correct data
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Acne Treatment Routine",
      description: "For acne-prone skin",
    });

    // Dialog should close
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("user creates template with name only", async () => {
    const user = setupUser();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    render(
      <CreateTemplateDialog
        open={true}
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
      />,
    );

    // User fills in only template name (description is optional)
    const nameInput = screen.getByLabelText(/template name/i);
    await user.type(nameInput, "Simple Routine");

    // User clicks Create Template button
    await user.click(screen.getByRole("button", { name: /create template/i }));

    // onSubmit was called with name and null description
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Simple Routine",
      description: null,
    });

    // Dialog should close
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("user cannot submit empty template name", async () => {
    const user = setupUser();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    render(
      <CreateTemplateDialog
        open={true}
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
      />,
    );

    // Create Template button should be disabled initially
    const createButton = screen.getByRole("button", {
      name: /create template/i,
    });
    expect(createButton).toBeDisabled();

    // User types whitespace only
    const nameInput = screen.getByLabelText(/template name/i);
    await user.type(nameInput, "   ");

    // Button should still be disabled
    expect(createButton).toBeDisabled();

    // onSubmit should not have been called
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("user sees loading state during submission", async () => {
    const user = setupUser();
    let resolveSubmit: () => void;
    const onSubmit = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    const onOpenChange = vi.fn();

    render(
      <CreateTemplateDialog
        open={true}
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
      />,
    );

    // User fills in template name
    const nameInput = screen.getByLabelText(/template name/i);
    await user.type(nameInput, "New Template");

    // User clicks Create Template button
    const createButton = screen.getByRole("button", {
      name: /create template/i,
    });
    await user.click(createButton);

    // Button should show loading state
    expect(
      screen.getByRole("button", { name: /creating\.\.\./i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /creating\.\.\./i }),
    ).toBeDisabled();

    // Resolve the submission
    resolveSubmit!();

    // Wait for loading state to disappear
    await screen.findByRole("button", { name: /create template/i });
  });

  it("user cancels template creation", async () => {
    const user = setupUser();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    render(
      <CreateTemplateDialog
        open={true}
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
      />,
    );

    // User fills in some data
    const nameInput = screen.getByLabelText(/template name/i);
    await user.type(nameInput, "Test Template");

    const descriptionInput = screen.getByLabelText(/description/i);
    await user.type(descriptionInput, "Test description");

    // User clicks Cancel
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    // Dialog should close without submitting
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

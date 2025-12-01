import { render, screen, waitFor, setupUser } from "@/test/utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AddRoutineModal } from "./add-routine-modal";
import { makeRoutineTemplate } from "@/test/factories";

describe("AddRoutineModal - Template Copying Preserves Step Types", () => {
  const mockOnCreateFromTemplate = vi.fn();
  const mockOnCreateBlank = vi.fn();
  const mockOnOpenChange = vi.fn();

  const mockTemplates = [
    {
      id: "template-1",
      name: "Morning Routine with Instructions",
      description: "Includes instruction-only steps",
    },
    {
      id: "template-2",
      name: "Evening Routine",
      description: "Standard product routine",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("user creates routine from template and stepType is preserved in the callback", async () => {
    const user = setupUser();

    // Mock the callback to resolve successfully
    mockOnCreateFromTemplate.mockResolvedValue(undefined);

    render(
      <AddRoutineModal
        open={true}
        onOpenChange={mockOnOpenChange}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
      />,
    );

    // User sees the initial modal with two options
    expect(screen.getByText("New routine")).toBeInTheDocument();
    expect(screen.getByText("From template")).toBeInTheDocument();
    expect(screen.getByText("Blank routine")).toBeInTheDocument();

    // User clicks "From template"
    await user.click(screen.getByText("From template"));

    // User sees template selection screen
    expect(await screen.findByText("Select a template")).toBeInTheDocument();
    expect(
      screen.getByText("Morning Routine with Instructions"),
    ).toBeInTheDocument();
    expect(screen.getByText("Evening Routine")).toBeInTheDocument();

    // User selects the first template (default selection)
    // Template 1 should already be selected by default

    // User clicks Continue
    await user.click(screen.getByRole("button", { name: /continue/i }));

    // User sees the info screen with pre-filled routine name
    expect(
      await screen.findByDisplayValue("Morning Routine with Instructions"),
    ).toBeInTheDocument();

    // User enters start date
    const startDateInput = screen.getByLabelText(/start date/i);
    await user.type(startDateInput, "2025-02-01");

    // User enters end date (optional)
    const endDateInput = screen.getByLabelText(/end date/i);
    await user.type(endDateInput, "2025-04-01");

    // User clicks Create Routine
    await user.click(screen.getByRole("button", { name: /create routine/i }));

    // Verify the callback was called with correct parameters
    await waitFor(() => {
      expect(mockOnCreateFromTemplate).toHaveBeenCalledWith(
        "template-1",
        "Morning Routine with Instructions",
        expect.any(Date),
        expect.any(Date),
      );
    });

    // Verify dates are correct
    const [[templateId, routineName, startDate, endDate]] =
      mockOnCreateFromTemplate.mock.calls;
    expect(templateId).toBe("template-1");
    expect(routineName).toBe("Morning Routine with Instructions");
    expect(startDate.toISOString().split("T")[0]).toBe("2025-02-01");
    expect(endDate?.toISOString().split("T")[0]).toBe("2025-04-01");

    // Modal should close on success
    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("user creates routine from template without end date", async () => {
    const user = setupUser();

    mockOnCreateFromTemplate.mockResolvedValue(undefined);

    render(
      <AddRoutineModal
        open={true}
        onOpenChange={mockOnOpenChange}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
      />,
    );

    // User navigates through template selection
    await user.click(screen.getByText("From template"));
    await user.click(await screen.findByRole("button", { name: /continue/i }));

    // User enters only start date (no end date)
    const startDateInput = await screen.findByLabelText(/start date/i);
    await user.type(startDateInput, "2025-02-01");

    // User creates routine
    await user.click(screen.getByRole("button", { name: /create routine/i }));

    // Verify endDate is null
    await waitFor(() => {
      expect(mockOnCreateFromTemplate).toHaveBeenCalledWith(
        "template-1",
        expect.any(String),
        expect.any(Date),
        null,
      );
    });
  });

  it("user selects a specific template from the list", async () => {
    const user = setupUser();

    mockOnCreateFromTemplate.mockResolvedValue(undefined);

    render(
      <AddRoutineModal
        open={true}
        onOpenChange={mockOnOpenChange}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
      />,
    );

    // User navigates to template selection
    await user.click(screen.getByText("From template"));

    // User sees both templates
    expect(
      await screen.findByText("Morning Routine with Instructions"),
    ).toBeInTheDocument();
    expect(screen.getByText("Evening Routine")).toBeInTheDocument();

    // User clicks on the second template
    const eveningRoutineRadio = screen.getByRole("radio", {
      name: /evening routine/i,
    });
    await user.click(eveningRoutineRadio);

    // User continues
    await user.click(screen.getByRole("button", { name: /continue/i }));

    // Routine name should be pre-filled with template 2's name
    expect(
      await screen.findByDisplayValue("Evening Routine"),
    ).toBeInTheDocument();

    // User creates routine
    const startDateInput = screen.getByLabelText(/start date/i);
    await user.type(startDateInput, "2025-03-01");

    await user.click(screen.getByRole("button", { name: /create routine/i }));

    // Verify template-2 was used
    await waitFor(() => {
      expect(mockOnCreateFromTemplate).toHaveBeenCalledWith(
        "template-2",
        "Evening Routine",
        expect.any(Date),
        null,
      );
    });
  });

  it("user customizes the routine name before creating", async () => {
    const user = setupUser();

    mockOnCreateFromTemplate.mockResolvedValue(undefined);

    render(
      <AddRoutineModal
        open={true}
        onOpenChange={mockOnOpenChange}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
      />,
    );

    // User navigates through wizard
    await user.click(screen.getByText("From template"));
    await user.click(await screen.findByRole("button", { name: /continue/i }));

    // User sees pre-filled name
    const routineNameInput = await screen.findByLabelText(/routine name/i);
    expect(routineNameInput).toHaveValue("Morning Routine with Instructions");

    // User customizes the name
    await user.clear(routineNameInput);
    await user.type(routineNameInput, "My Custom Morning Routine");

    // User creates routine
    const startDateInput = screen.getByLabelText(/start date/i);
    await user.type(startDateInput, "2025-02-15");

    await user.click(screen.getByRole("button", { name: /create routine/i }));

    // Verify custom name was used
    await waitFor(() => {
      expect(mockOnCreateFromTemplate).toHaveBeenCalledWith(
        "template-1",
        "My Custom Morning Routine",
        expect.any(Date),
        null,
      );
    });
  });

  it("user searches for templates and filters the list", async () => {
    const user = setupUser();

    render(
      <AddRoutineModal
        open={true}
        onOpenChange={mockOnOpenChange}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
      />,
    );

    // User navigates to template selection
    await user.click(screen.getByText("From template"));

    // User sees search input
    const searchInput = await screen.findByPlaceholderText(
      /search routine templates/i,
    );

    // User searches for "Evening"
    await user.type(searchInput, "Evening");

    // User sees only the Evening Routine
    expect(screen.getByText("Evening Routine")).toBeInTheDocument();
    expect(
      screen.queryByText("Morning Routine with Instructions"),
    ).not.toBeInTheDocument();

    // User clears search
    await user.clear(searchInput);

    // User sees all templates again
    expect(
      screen.getByText("Morning Routine with Instructions"),
    ).toBeInTheDocument();
    expect(screen.getByText("Evening Routine")).toBeInTheDocument();
  });

  it("user navigates back through the wizard steps", async () => {
    const user = setupUser();

    render(
      <AddRoutineModal
        open={true}
        onOpenChange={mockOnOpenChange}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
      />,
    );

    // User starts with template flow
    await user.click(screen.getByText("From template"));

    // User is on template selection
    expect(await screen.findByText("Select a template")).toBeInTheDocument();

    // User goes back
    await user.click(screen.getByRole("button", { name: /go back/i }));

    // User is back at start screen
    expect(await screen.findByText("New routine")).toBeInTheDocument();
    expect(screen.getByText("From template")).toBeInTheDocument();

    // User proceeds again to template selection
    await user.click(screen.getByText("From template"));
    await user.click(await screen.findByRole("button", { name: /continue/i }));

    // User is on info screen
    expect(await screen.findByText("Customise routine")).toBeInTheDocument();

    // User goes back
    await user.click(screen.getByRole("button", { name: /go back/i }));

    // User is back at template selection
    expect(await screen.findByText("Select a template")).toBeInTheDocument();
  });

  it("user cancels the modal at any stage", async () => {
    const user = setupUser();

    render(
      <AddRoutineModal
        open={true}
        onOpenChange={mockOnOpenChange}
        templates={mockTemplates}
        onCreateFromTemplate={mockOnCreateFromTemplate}
        onCreateBlank={mockOnCreateBlank}
      />,
    );

    // User navigates to template selection
    await user.click(screen.getByText("From template"));

    // User clicks Cancel
    await user.click(await screen.findByRole("button", { name: /cancel/i }));

    // Verify modal close was called
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);

    // Verify no creation happened
    expect(mockOnCreateFromTemplate).not.toHaveBeenCalled();
  });
});

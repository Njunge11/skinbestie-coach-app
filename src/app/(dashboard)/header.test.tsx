import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Header from "./header";

describe("Header - UI Integration Tests", () => {
  const mockUser = {
    name: "John Doe",
    email: "john@example.com",
    role: "Admin",
    avatar: undefined,
  };

  it("displays user name and role", () => {
    render(
      <Header user={mockUser} onLogout={vi.fn()} onMenuClick={vi.fn()} />
    );

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("displays avatar fallback with user initials", () => {
    render(
      <Header user={mockUser} onLogout={vi.fn()} onMenuClick={vi.fn()} />
    );

    // Avatar fallback should show initials "JD"
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("displays avatar fallback with single initial for single name", () => {
    const user = {
      name: "Madonna",
      email: "madonna@example.com",
      role: "Admin",
      avatar: undefined,
    };

    render(<Header user={user} onLogout={vi.fn()} onMenuClick={vi.fn()} />);

    // Avatar fallback should show initial "M"
    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("user opens dropdown menu and clicks logout", async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();

    render(
      <Header user={mockUser} onLogout={onLogout} onMenuClick={vi.fn()} />
    );

    // Find and click the dropdown trigger button
    const dropdownTrigger = screen.getByRole("button", { name: /john doe/i });
    await user.click(dropdownTrigger);

    // Find and click the logout menu item
    const logoutItem = screen.getByRole("menuitem", { name: /log out/i });
    await user.click(logoutItem);

    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("user clicks mobile menu button", async () => {
    const user = userEvent.setup();
    const onMenuClick = vi.fn();

    render(
      <Header user={mockUser} onLogout={vi.fn()} onMenuClick={onMenuClick} />
    );

    // Find the menu icon button (it has no accessible name, just an icon)
    const buttons = screen.getAllByRole("button");
    const menuButton = buttons.find((button) => {
      // The menu button is the one that's NOT the dropdown trigger
      return !button.textContent?.includes("John Doe");
    });

    expect(menuButton).toBeDefined();

    if (menuButton) {
      await user.click(menuButton);
      expect(onMenuClick).toHaveBeenCalledTimes(1);
    }
  });

  it("dropdown menu is initially closed", () => {
    render(
      <Header user={mockUser} onLogout={vi.fn()} onMenuClick={vi.fn()} />
    );

    // Menu item should not be visible initially
    expect(screen.queryByRole("menuitem", { name: /log out/i })).not.toBeInTheDocument();
  });

  it("dropdown menu opens when user clicks trigger", async () => {
    const user = userEvent.setup();

    render(
      <Header user={mockUser} onLogout={vi.fn()} onMenuClick={vi.fn()} />
    );

    // Initially closed
    expect(screen.queryByRole("menuitem", { name: /log out/i })).not.toBeInTheDocument();

    // Click trigger to open
    const dropdownTrigger = screen.getByRole("button", { name: /john doe/i });
    await user.click(dropdownTrigger);

    // Now menu item should be visible
    expect(screen.getByRole("menuitem", { name: /log out/i })).toBeInTheDocument();
  });
});

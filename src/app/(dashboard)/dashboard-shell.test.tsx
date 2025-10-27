import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardShell from "./dashboard-shell";

// Use vi.hoisted to ensure mocks are available before module loading
const { mockSignOut, mockPush, mockUsePathname } = vi.hoisted(() => ({
  mockSignOut: vi.fn(),
  mockPush: vi.fn(),
  mockUsePathname: vi.fn(() => "/"),
}));

// Mock next-auth
vi.mock("next-auth/react", () => ({
  signOut: mockSignOut,
}));

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: mockUsePathname,
}));

// Mock Next.js Image
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

describe("DashboardShell - UI Integration Tests", () => {
  const mockUser = {
    name: "Jane Smith",
    email: "jane@example.com",
    role: "Admin",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children content", () => {
    render(
      <DashboardShell user={mockUser}>
        <div>Dashboard Content</div>
      </DashboardShell>
    );

    expect(screen.getByText("Dashboard Content")).toBeInTheDocument();
  });

  it("displays user information in header", () => {
    render(
      <DashboardShell user={mockUser}>
        <div>Content</div>
      </DashboardShell>
    );

    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("user logs out from header dropdown", async () => {
    const user = userEvent.setup();

    mockSignOut.mockResolvedValueOnce(undefined);

    render(
      <DashboardShell user={mockUser}>
        <div>Content</div>
      </DashboardShell>
    );

    // Open header dropdown
    const dropdownTrigger = screen.getByRole("button", { name: /jane smith/i });
    await user.click(dropdownTrigger);

    // Click logout in dropdown
    const logoutItem = screen.getByRole("menuitem", { name: /log out/i });
    await user.click(logoutItem);

    expect(mockSignOut).toHaveBeenCalledWith({ redirect: false });
    expect(mockPush).toHaveBeenCalledWith("/login");
  });

  it("user logs out from sidebar button", async () => {
    const user = userEvent.setup();

    mockSignOut.mockResolvedValueOnce(undefined);

    render(
      <DashboardShell user={mockUser}>
        <div>Content</div>
      </DashboardShell>
    );

    // Click logout in sidebar
    const logoutButtons = screen.getAllByRole("button", { name: /log out/i });
    // Sidebar logout button is the one not in a menuitem
    const sidebarLogoutButton = logoutButtons[0]; // First one is in sidebar

    await user.click(sidebarLogoutButton);

    expect(mockSignOut).toHaveBeenCalledWith({ redirect: false });
    expect(mockPush).toHaveBeenCalledWith("/login");
  });

  it("mobile menu toggles open and closed", async () => {
    const user = userEvent.setup();

    render(
      <DashboardShell user={mockUser}>
        <div>Content</div>
      </DashboardShell>
    );

    const sidebar = screen.getByRole("complementary");

    // Initially closed on mobile
    expect(sidebar).toHaveClass("-translate-x-full");

    // Find and click menu button in header
    const allButtons = screen.getAllByRole("button");
    const menuButton = allButtons.find((button) => {
      return (
        !button.textContent?.includes("Jane Smith") &&
        !button.textContent?.includes("Log out")
      );
    });

    expect(menuButton).toBeDefined();

    if (menuButton) {
      // Click to open
      await user.click(menuButton);
      expect(sidebar).toHaveClass("translate-x-0");

      // Click again to close
      await user.click(menuButton);
      expect(sidebar).toHaveClass("-translate-x-full");
    }
  });

  it("mobile menu closes when user clicks backdrop", async () => {
    const user = userEvent.setup();

    render(
      <DashboardShell user={mockUser}>
        <div>Content</div>
      </DashboardShell>
    );

    const sidebar = screen.getByRole("complementary");

    // Open menu first
    const allButtons = screen.getAllByRole("button");
    const menuButton = allButtons.find((button) => {
      return (
        !button.textContent?.includes("Jane Smith") &&
        !button.textContent?.includes("Log out")
      );
    });

    if (menuButton) {
      await user.click(menuButton);
      expect(sidebar).toHaveClass("translate-x-0");

      // Click backdrop to close
      const backdrop = sidebar.previousElementSibling;
      if (backdrop) {
        await user.click(backdrop as HTMLElement);
        expect(sidebar).toHaveClass("-translate-x-full");
      }
    }
  });
});

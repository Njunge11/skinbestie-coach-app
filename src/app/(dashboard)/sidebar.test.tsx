import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Sidebar from "./sidebar";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

// Mock Next.js Image
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

describe("Sidebar - UI Integration Tests", () => {
  it("highlights Home as active when on home page", async () => {
    const { usePathname } = await import("next/navigation");
    vi.mocked(usePathname).mockReturnValue("/");

    render(
      <Sidebar
        onLogout={vi.fn()}
        isMobileOpen={false}
        setIsMobileOpen={vi.fn()}
      />
    );

    const homeLink = screen.getByRole("link", { name: /home/i });
    const subscribersLink = screen.getByRole("link", { name: /subscribers/i });

    expect(homeLink).toHaveClass("bg-primary");
    expect(homeLink).toHaveClass("text-primary-foreground");
    expect(subscribersLink).not.toHaveClass("bg-primary");
  });

  it("highlights Subscribers as active when on subscribers page", async () => {
    const { usePathname } = await import("next/navigation");
    vi.mocked(usePathname).mockReturnValue("/subscribers");

    render(
      <Sidebar
        onLogout={vi.fn()}
        isMobileOpen={false}
        setIsMobileOpen={vi.fn()}
      />
    );

    const homeLink = screen.getByRole("link", { name: /home/i });
    const subscribersLink = screen.getByRole("link", { name: /subscribers/i });

    expect(subscribersLink).toHaveClass("bg-primary");
    expect(subscribersLink).toHaveClass("text-primary-foreground");
    expect(homeLink).not.toHaveClass("bg-primary");
  });

  it("highlights Subscribers as active when on a subscriber detail page", async () => {
    const { usePathname } = await import("next/navigation");
    vi.mocked(usePathname).mockReturnValue("/subscribers/123");

    render(
      <Sidebar
        onLogout={vi.fn()}
        isMobileOpen={false}
        setIsMobileOpen={vi.fn()}
      />
    );

    const subscribersLink = screen.getByRole("link", { name: /subscribers/i });

    expect(subscribersLink).toHaveClass("bg-primary");
    expect(subscribersLink).toHaveClass("text-primary-foreground");
  });

  it("user clicks logout button and callback is triggered", async () => {
    const user = userEvent.setup();
    const { usePathname } = await import("next/navigation");
    vi.mocked(usePathname).mockReturnValue("/");

    const onLogout = vi.fn();
    const setIsMobileOpen = vi.fn();

    render(
      <Sidebar
        onLogout={onLogout}
        isMobileOpen={false}
        setIsMobileOpen={setIsMobileOpen}
      />
    );

    const logoutButton = screen.getByRole("button", { name: /log out/i });
    await user.click(logoutButton);

    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(setIsMobileOpen).toHaveBeenCalledWith(false);
  });

  it("user clicks navigation link and mobile menu closes", async () => {
    const user = userEvent.setup();
    const { usePathname } = await import("next/navigation");
    vi.mocked(usePathname).mockReturnValue("/");

    const setIsMobileOpen = vi.fn();

    render(
      <Sidebar
        onLogout={vi.fn()}
        isMobileOpen={true}
        setIsMobileOpen={setIsMobileOpen}
      />
    );

    const subscribersLink = screen.getByRole("link", { name: /subscribers/i });
    await user.click(subscribersLink);

    expect(setIsMobileOpen).toHaveBeenCalledWith(false);
  });

  it("sidebar is visible when isMobileOpen is true", async () => {
    const { usePathname } = await import("next/navigation");
    vi.mocked(usePathname).mockReturnValue("/");

    render(
      <Sidebar
        onLogout={vi.fn()}
        isMobileOpen={true}
        setIsMobileOpen={vi.fn()}
      />
    );

    const sidebar = screen.getByRole("complementary");
    expect(sidebar).toHaveClass("translate-x-0");
    expect(sidebar).not.toHaveClass("-translate-x-full");
  });

  it("sidebar is hidden when isMobileOpen is false", async () => {
    const { usePathname } = await import("next/navigation");
    vi.mocked(usePathname).mockReturnValue("/");

    render(
      <Sidebar
        onLogout={vi.fn()}
        isMobileOpen={false}
        setIsMobileOpen={vi.fn()}
      />
    );

    const sidebar = screen.getByRole("complementary");
    expect(sidebar).toHaveClass("-translate-x-full");
  });

  it("user clicks backdrop overlay and mobile menu closes", async () => {
    const user = userEvent.setup();
    const { usePathname } = await import("next/navigation");
    vi.mocked(usePathname).mockReturnValue("/");

    const setIsMobileOpen = vi.fn();

    render(
      <Sidebar
        onLogout={vi.fn()}
        isMobileOpen={true}
        setIsMobileOpen={setIsMobileOpen}
      />
    );

    // The backdrop overlay is the div with bg-black/50
    const backdrop = screen.getByRole("complementary").previousElementSibling;
    if (backdrop) {
      await user.click(backdrop as HTMLElement);
      expect(setIsMobileOpen).toHaveBeenCalledWith(false);
    }
  });
});

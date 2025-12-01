import { render, screen } from "@testing-library/react";
import { setupUser } from "@/test/utils";
import { describe, it, expect, vi } from "vitest";
import { PasswordResetSuccessState } from "./password-reset-success-state";

describe("PasswordResetSuccessState", () => {
  it("renders success message with heading and description", () => {
    render(<PasswordResetSuccessState onBackToLogin={vi.fn()} />);

    expect(screen.getByRole("heading")).toHaveTextContent(
      /password reset successful/i,
    );
    expect(
      screen.getByText(/your password has been updated successfully/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /back to login/i }),
    ).toBeInTheDocument();
  });

  it("calls onBackToLogin when back to login button is clicked", async () => {
    const user = setupUser();
    const handleBackToLogin = vi.fn();
    render(<PasswordResetSuccessState onBackToLogin={handleBackToLogin} />);

    await user.click(screen.getByRole("button", { name: /back to login/i }));

    expect(handleBackToLogin).toHaveBeenCalledTimes(1);
  });

  it("has accessible back to login button", () => {
    render(<PasswordResetSuccessState onBackToLogin={vi.fn()} />);

    const button = screen.getByRole("button", { name: /back to login/i });
    expect(button).toBeInTheDocument();
  });
});

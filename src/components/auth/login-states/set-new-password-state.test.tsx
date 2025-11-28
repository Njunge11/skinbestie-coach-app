import { render, screen, waitFor } from "@testing-library/react";
import { setupUser } from "@/test/utils";
import { describe, it, expect, vi } from "vitest";
import { SetNewPasswordState } from "./set-new-password-state";

describe("SetNewPasswordState", () => {
  it("renders set new password form with heading and instructions", () => {
    render(<SetNewPasswordState onContinue={vi.fn()} />);

    expect(screen.getByRole("heading")).toHaveTextContent(/set new password/i);
    expect(
      screen.getByText(/choose a strong password for your account/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reset password/i }),
    ).toBeInTheDocument();
  });

  it("allows user to type new password and confirm password", async () => {
    const user = setupUser();
    render(<SetNewPasswordState onContinue={vi.fn()} />);

    const newPasswordInput = screen.getByLabelText(/^new password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

    await user.type(newPasswordInput, "NewPass123");
    await user.type(confirmPasswordInput, "NewPass123");

    expect(newPasswordInput).toHaveValue("NewPass123");
    expect(confirmPasswordInput).toHaveValue("NewPass123");
  });

  it("calls onSubmit and onContinue when passwords match and are valid", async () => {
    const user = setupUser();
    const handleSubmit = vi.fn();
    const handleContinue = vi.fn();
    render(
      <SetNewPasswordState
        onContinue={handleContinue}
        onSubmit={handleSubmit}
      />,
    );

    await user.type(screen.getByLabelText(/^new password$/i), "ValidPass123");
    await user.type(screen.getByLabelText(/confirm password/i), "ValidPass123");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    // Wait for first assertion only
    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        password: "ValidPass123",
        confirmPassword: "ValidPass123",
      });
    });

    // Then check second assertion (no waiting needed)
    expect(handleContinue).toHaveBeenCalledTimes(1);
  });

  it("shows loading state while submitting", async () => {
    const user = setupUser();
    const submitPromise = new Promise<void>(() => {
      // Never resolves - testing loading state
    });
    const handleSubmit = vi.fn(() => submitPromise);

    render(
      <SetNewPasswordState onContinue={vi.fn()} onSubmit={handleSubmit} />,
    );

    await user.type(screen.getByLabelText(/^new password$/i), "ValidPass123");
    await user.type(screen.getByLabelText(/confirm password/i), "ValidPass123");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    // Wait for loading state to appear
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /updating/i })).toBeDisabled();
    });
  });

  it("shows error when password is less than 8 characters", async () => {
    const user = setupUser();
    render(<SetNewPasswordState onContinue={vi.fn()} />);

    const passwordInput = screen.getByLabelText(/^new password$/i);
    await user.type(passwordInput, "Pass1");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(
      await screen.findByText(/password must be at least 8 characters/i),
    ).toBeInTheDocument();
  });

  it("shows error when password is missing uppercase letter", async () => {
    const user = setupUser();
    render(<SetNewPasswordState onContinue={vi.fn()} />);

    await user.type(screen.getByLabelText(/^new password$/i), "password123");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(
      await screen.findByText(
        /password must contain at least one uppercase letter/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows error when password is missing lowercase letter", async () => {
    const user = setupUser();
    render(<SetNewPasswordState onContinue={vi.fn()} />);

    await user.type(screen.getByLabelText(/^new password$/i), "PASSWORD123");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(
      await screen.findByText(
        /password must contain at least one lowercase letter/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows error when password is missing number", async () => {
    const user = setupUser();
    render(<SetNewPasswordState onContinue={vi.fn()} />);

    await user.type(screen.getByLabelText(/^new password$/i), "PasswordOnly");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(
      await screen.findByText(/password must contain at least one number/i),
    ).toBeInTheDocument();
  });

  it("shows error when passwords do not match", async () => {
    const user = setupUser();
    render(<SetNewPasswordState onContinue={vi.fn()} />);

    await user.type(screen.getByLabelText(/^new password$/i), "ValidPass123");
    await user.type(
      screen.getByLabelText(/confirm password/i),
      "DifferentPass123",
    );
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(
      await screen.findByText(/passwords do not match/i),
    ).toBeInTheDocument();
  });

  it("clears password mismatch error when passwords match after being touched", async () => {
    const user = setupUser();
    render(<SetNewPasswordState onContinue={vi.fn()} />);

    const newPasswordInput = screen.getByLabelText(/^new password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

    // Type matching passwords
    await user.type(newPasswordInput, "ValidPass123");
    await user.type(confirmPasswordInput, "ValidPass123");

    // Change confirm password to not match
    await user.clear(confirmPasswordInput);
    await user.type(confirmPasswordInput, "DifferentPass123");

    // Trigger validation by leaving the field
    await user.click(newPasswordInput);

    // Error should appear
    expect(
      await screen.findByText(/passwords do not match/i),
    ).toBeInTheDocument();

    // Fix the password
    await user.clear(confirmPasswordInput);
    await user.type(confirmPasswordInput, "ValidPass123");

    // Click away to trigger validation
    await user.click(newPasswordInput);

    // Error should be gone
    await waitFor(() => {
      expect(
        screen.queryByText(/passwords do not match/i),
      ).not.toBeInTheDocument();
    });
  });

  it("has accessible password inputs with proper labels", () => {
    render(<SetNewPasswordState onContinue={vi.fn()} />);

    expect(screen.getByLabelText(/^new password$/i)).toHaveAttribute(
      "type",
      "password",
    );
    expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute(
      "type",
      "password",
    );
  });
});

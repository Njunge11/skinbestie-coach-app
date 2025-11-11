import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { LoginForm } from "./login-form";

// Mock server actions
vi.mock("@/actions/auth", () => ({
  forgotPasswordAction: vi.fn(),
  verifyCodeAction: vi.fn(),
  resetPasswordAction: vi.fn(),
}));

// Mock next-auth
vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

import {
  forgotPasswordAction,
  verifyCodeAction,
  resetPasswordAction,
} from "@/actions/auth";
import { signIn } from "next-auth/react";

describe("LoginForm - UI Tests", () => {
  const testEmail = "admin@example.com";
  const testVerificationCode = "123456";

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    vi.mocked(forgotPasswordAction).mockResolvedValue({
      success: true,
      message: "Code sent",
    });
    vi.mocked(verifyCodeAction).mockResolvedValue({
      success: true,
      message: "Code verified",
    });
    vi.mocked(resetPasswordAction).mockResolvedValue({
      success: true,
      message: "Password reset",
    });
    vi.mocked(signIn).mockResolvedValue({
      ok: false,
      error: null,
    } as unknown as Awaited<ReturnType<typeof signIn>>);
  });

  it("allows user to complete full password reset flow and return to login", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    // 1. Start at login, click forgot password
    expect(
      screen.getByRole("heading", { name: /sign in/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /forgot password/i }));

    // 2. Enter email for reset
    expect(
      screen.getByRole("heading", { name: /reset password/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/enter your email address and we'll send you a code/i),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText(/email address/i), testEmail);
    await user.click(screen.getByRole("button", { name: /continue/i }));

    // 3. Enter verification code - wait for state transition
    expect(
      await screen.findByRole("heading", { name: /check your email/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/we've sent a 6-digit code to/i),
    ).toBeInTheDocument();

    // Enter the verification code
    await user.type(
      screen.getByLabelText(/verification code/i),
      testVerificationCode,
    );
    await user.click(screen.getByRole("button", { name: /verify code/i }));

    // 4. Set new password - wait for state transition
    expect(
      await screen.findByRole("heading", { name: /set new password/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/choose a strong password for your account/i),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText(/^new password$/i), "NewPass123");
    await user.type(screen.getByLabelText(/confirm password/i), "NewPass123");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    // 5. Success screen - wait for state transition
    expect(
      await screen.findByRole("heading", {
        name: /password reset successful/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/your password has been updated successfully/i),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /back to login/i }));

    // 6. Back to login
    expect(
      screen.getByRole("heading", { name: /sign in/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("allows user to resend verification code", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    // Navigate to verification code state
    await user.click(screen.getByRole("button", { name: /forgot password/i }));
    await user.type(screen.getByLabelText(/email address/i), testEmail);
    await user.click(screen.getByRole("button", { name: /continue/i }));

    // Should see resend email button - wait for state transition
    expect(
      await screen.findByRole("heading", { name: /check your email/i }),
    ).toBeInTheDocument();
    const resendButton = screen.getByRole("button", { name: /resend email/i });
    expect(resendButton).toBeInTheDocument();

    // Should be clickable
    await user.click(resendButton);
  });

  it("maintains form state correctly through navigation", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    // Type in login form
    await user.type(
      screen.getByLabelText(/email address/i),
      "test@example.com",
    );
    expect(screen.getByLabelText(/email address/i)).toHaveValue(
      "test@example.com",
    );

    // Navigate to forgot password
    await user.click(screen.getByRole("button", { name: /forgot password/i }));
    expect(
      screen.getByRole("heading", { name: /reset password/i }),
    ).toBeInTheDocument();

    // Email field should be empty in forgot password form (new form instance)
    expect(screen.getByLabelText(/email address/i)).toHaveValue("");
  });

  it("validates form at each step before allowing progression", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    // Go to forgot password
    await user.click(screen.getByRole("button", { name: /forgot password/i }));

    // Try to continue without email - should show error
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(
      await screen.findByText(/please enter a valid email address/i),
    ).toBeInTheDocument();

    // Should not progress to next state - still on forgot password
    expect(
      screen.getByRole("heading", { name: /reset password/i }),
    ).toBeInTheDocument();
  });
});

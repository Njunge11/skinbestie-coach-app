import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LoginForm } from './login-form';

describe('LoginForm - UI Tests', () => {
  // Mock fetch for all API calls
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn((url: string | URL | Request) => {
      const urlString = typeof url === 'string' ? url : url instanceof Request ? url.url : url.toString();

      // Mock /api/auth/forgot-password endpoint
      if (urlString.includes('/api/auth/forgot-password')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            message: 'If an account exists with this email, you will receive a verification code'
          }),
        } as Response);
      }

      // Mock /api/auth/verify-code endpoint
      if (urlString.includes('/api/auth/verify-code')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            message: 'Verification code is valid'
          }),
        } as Response);
      }

      // Mock /api/auth/reset-password endpoint
      if (urlString.includes('/api/auth/reset-password')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            message: 'Password reset successful'
          }),
        } as Response);
      }

      // Default fallback
      return Promise.reject(new Error(`Unmocked fetch call to: ${urlString}`));
    }) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });
  it('renders login form as initial state', () => {
    render(<LoginForm />);

    expect(screen.getByRole('heading')).toHaveTextContent(/welcome back/i);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^login$/i })).toBeInTheDocument();
  });

  it('allows user to complete full password reset flow and return to login', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    // 1. Start at login, click forgot password
    expect(screen.getByRole('heading')).toHaveTextContent(/welcome back/i);
    await user.click(screen.getByRole('button', { name: /forgot your password/i }));

    // 2. Enter email for reset
    expect(screen.getByRole('heading')).toHaveTextContent(/reset password/i);
    expect(
      screen.getByText(/enter your email address and we'll send you a code/i)
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText(/email/i), 'admin@example.com');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // 3. Enter verification code
    expect(screen.getByRole('heading')).toHaveTextContent(/enter verification code/i);
    expect(
      screen.getByText(/we've sent a 6-digit code to your email address/i)
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText(/verification code/i), '123456');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // 4. Set new password
    expect(screen.getByRole('heading')).toHaveTextContent(/set new password/i);
    expect(
      screen.getByText(/choose a strong password for your account/i)
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText(/^new password$/i), 'NewPass123');
    await user.type(screen.getByLabelText(/confirm password/i), 'NewPass123');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // 5. Success screen
    expect(screen.getByRole('heading')).toHaveTextContent(/password reset successful/i);
    expect(
      screen.getByText(/your password has been updated successfully/i)
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /back to login/i }));

    // 6. Back to login
    expect(screen.getByRole('heading')).toHaveTextContent(/welcome back/i);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('allows user to navigate back to login from forgot password state', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    // Go to forgot password
    await user.click(screen.getByRole('button', { name: /forgot your password/i }));
    expect(screen.getByRole('heading')).toHaveTextContent(/reset password/i);

    // Navigate back to login
    await user.click(screen.getByRole('button', { name: /back to login/i }));
    expect(screen.getByRole('heading')).toHaveTextContent(/welcome back/i);
  });

  it('allows user to resend verification code', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    // Navigate to verification code state
    await user.click(screen.getByRole('button', { name: /forgot your password/i }));
    await user.type(screen.getByLabelText(/email/i), 'admin@example.com');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // Should see resend code button
    expect(screen.getByRole('heading')).toHaveTextContent(/enter verification code/i);
    const resendButton = screen.getByRole('button', { name: /resend code/i });
    expect(resendButton).toBeInTheDocument();

    // Should be clickable
    await user.click(resendButton);
  });

  it('maintains form state correctly through navigation', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    // Type in login form
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    expect(screen.getByLabelText(/email/i)).toHaveValue('test@example.com');

    // Navigate to forgot password
    await user.click(screen.getByRole('button', { name: /forgot your password/i }));
    expect(screen.getByRole('heading')).toHaveTextContent(/reset password/i);

    // Email field should be empty in forgot password form (new form instance)
    expect(screen.getByLabelText(/email/i)).toHaveValue('');
  });

  it('shows all states have proper headings for navigation landmarks', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    // Login state
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();

    // Forgot password state
    await user.click(screen.getByRole('button', { name: /forgot your password/i }));
    expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument();

    // Verification state
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByRole('heading', { name: /enter verification code/i })).toBeInTheDocument();

    // New password state
    await user.type(screen.getByLabelText(/verification code/i), '123456');
    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();

    // Success state
    await user.type(screen.getByLabelText(/^new password$/i), 'ValidPass123');
    await user.type(screen.getByLabelText(/confirm password/i), 'ValidPass123');
    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByRole('heading', { name: /password reset successful/i })).toBeInTheDocument();
  });

  it('validates form at each step before allowing progression', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    // Go to forgot password
    await user.click(screen.getByRole('button', { name: /forgot your password/i }));

    // Try to continue without email - should show error
    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(await screen.findByText(/please enter a valid email address/i)).toBeInTheDocument();

    // Should not progress to next state - still on forgot password
    expect(screen.getByRole('heading')).toHaveTextContent(/reset password/i);
  });

});

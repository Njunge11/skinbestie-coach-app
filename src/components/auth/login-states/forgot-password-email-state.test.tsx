import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ForgotPasswordEmailState } from './forgot-password-email-state';

describe('ForgotPasswordEmailState', () => {
  it('renders forgot password form with heading and instructions', () => {
    render(
      <ForgotPasswordEmailState
        onContinue={vi.fn()}
        onBackToLogin={vi.fn()}
      />
    );

    expect(screen.getByRole('heading')).toHaveTextContent(/reset password/i);
    expect(
      screen.getByText(/enter your email address and we'll send you a code/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument();
  });

  it('allows user to type email address', async () => {
    const user = userEvent.setup();
    render(
      <ForgotPasswordEmailState
        onContinue={vi.fn()}
        onBackToLogin={vi.fn()}
      />
    );

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'admin@example.com');

    expect(emailInput).toHaveValue('admin@example.com');
  });

  it('calls onSubmit and onContinue when form is valid', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    const handleContinue = vi.fn();
    render(
      <ForgotPasswordEmailState
        onContinue={handleContinue}
        onBackToLogin={vi.fn()}
        onSubmit={handleSubmit}
      />
    );

    await user.type(screen.getByLabelText(/email/i), 'admin@example.com');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // Wait for first assertion only
    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        email: 'admin@example.com',
      });
    });

    // Then check second assertion (no waiting needed)
    expect(handleContinue).toHaveBeenCalledTimes(1);
  });

  it('shows loading state while submitting', async () => {
    const user = userEvent.setup();
    let resolveSubmit: () => void;
    const submitPromise = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });
    const handleSubmit = vi.fn(() => submitPromise);

    render(
      <ForgotPasswordEmailState
        onContinue={vi.fn()}
        onBackToLogin={vi.fn()}
        onSubmit={handleSubmit}
      />
    );

    await user.type(screen.getByLabelText(/email/i), 'admin@example.com');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // Wait for loading state to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled();
    });
  });

  it('prevents form submission when email is invalid', async () => {
    const user = userEvent.setup();
    const handleContinue = vi.fn();
    const handleSubmit = vi.fn();

    render(
      <ForgotPasswordEmailState
        onContinue={handleContinue}
        onBackToLogin={vi.fn()}
        onSubmit={handleSubmit}
      />
    );

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'not-an-email');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // Form should not progress when validation fails
    expect(handleSubmit).not.toHaveBeenCalled();
    expect(handleContinue).not.toHaveBeenCalled();
  });

  it('shows error when email is empty', async () => {
    const user = userEvent.setup();
    render(
      <ForgotPasswordEmailState
        onContinue={vi.fn()}
        onBackToLogin={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByText(/please enter a valid email address/i)).toBeInTheDocument();
  });

  it('calls onBackToLogin when back to login button is clicked', async () => {
    const user = userEvent.setup();
    const handleBackToLogin = vi.fn();
    render(
      <ForgotPasswordEmailState
        onContinue={vi.fn()}
        onBackToLogin={handleBackToLogin}
      />
    );

    await user.click(screen.getByRole('button', { name: /back to login/i }));

    expect(handleBackToLogin).toHaveBeenCalledTimes(1);
  });

  it('has accessible email input with proper label', () => {
    render(
      <ForgotPasswordEmailState
        onContinue={vi.fn()}
        onBackToLogin={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email');
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { LoginFormState } from './login-form-state';

describe('LoginFormState', () => {
  it('renders login form with all required fields', () => {
    render(<LoginFormState onForgotPassword={vi.fn()} />);

    expect(screen.getByRole('heading')).toHaveTextContent(/welcome back/i);
    expect(screen.getByText(/login to your skinbestie account/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^login$/i })).toBeInTheDocument();
  });

  it('allows user to type email and password', async () => {
    const user = userEvent.setup();
    render(<LoginFormState onForgotPassword={vi.fn()} />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(emailInput, 'admin@example.com');
    await user.type(passwordInput, 'password123');

    expect(emailInput).toHaveValue('admin@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('calls onSubmit with correct data when form is valid', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<LoginFormState onForgotPassword={vi.fn()} onSubmit={handleSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'admin@example.com');
    await user.type(screen.getByLabelText(/password/i), 'ValidPass123');
    await user.click(screen.getByRole('button', { name: /^login$/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        email: 'admin@example.com',
        password: 'ValidPass123',
      });
    });
  });

  it('shows loading state while submitting', async () => {
    const user = userEvent.setup();
    let resolveSubmit: () => void;
    const submitPromise = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });
    const handleSubmit = vi.fn(() => submitPromise);

    render(<LoginFormState onForgotPassword={vi.fn()} onSubmit={handleSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'admin@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /^login$/i }));

    // Wait for loading state to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /logging in/i })).toBeDisabled();
    });
  });

  it('prevents form submission when email is invalid', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<LoginFormState onForgotPassword={vi.fn()} onSubmit={handleSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'invalid-email');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /^login$/i }));

    // Form should not progress when validation fails
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('shows error when email is empty', async () => {
    const user = userEvent.setup();
    render(<LoginFormState onForgotPassword={vi.fn()} />);

    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /^login$/i }));

    expect(await screen.findByText(/please enter a valid email address/i)).toBeInTheDocument();
  });

  it('shows error when password is empty', async () => {
    const user = userEvent.setup();
    render(<LoginFormState onForgotPassword={vi.fn()} />);

    await user.type(screen.getByLabelText(/email/i), 'admin@example.com');
    await user.click(screen.getByRole('button', { name: /^login$/i }));

    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
  });

  it('calls onForgotPassword when forgot password button is clicked', async () => {
    const user = userEvent.setup();
    const handleForgotPassword = vi.fn();
    render(<LoginFormState onForgotPassword={handleForgotPassword} />);

    await user.click(screen.getByRole('button', { name: /forgot your password/i }));

    expect(handleForgotPassword).toHaveBeenCalledTimes(1);
  });

  it('has accessible form inputs with proper labels', () => {
    render(<LoginFormState onForgotPassword={vi.fn()} />);

    // Should be queryable by label (accessible)
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
  });
});

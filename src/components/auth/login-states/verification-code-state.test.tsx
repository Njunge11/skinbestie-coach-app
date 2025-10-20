import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { VerificationCodeState } from './verification-code-state';

describe('VerificationCodeState', () => {
  it('renders verification code form with heading and instructions', () => {
    render(
      <VerificationCodeState
        onContinue={vi.fn()}
        onResendCode={vi.fn()}
      />
    );

    expect(screen.getByRole('heading')).toHaveTextContent(/enter verification code/i);
    expect(
      screen.getByText(/we've sent a 6-digit code to your email address/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend code/i })).toBeInTheDocument();
  });

  it('allows user to type 6-digit code', async () => {
    const user = userEvent.setup();
    render(
      <VerificationCodeState
        onContinue={vi.fn()}
        onResendCode={vi.fn()}
      />
    );

    const codeInput = screen.getByLabelText(/verification code/i);
    await user.type(codeInput, '123456');

    expect(codeInput).toHaveValue('123456');
  });

  it('limits input to 6 characters', async () => {
    render(
      <VerificationCodeState
        onContinue={vi.fn()}
        onResendCode={vi.fn()}
      />
    );

    const codeInput = screen.getByLabelText(/verification code/i);

    // Input has maxLength attribute
    expect(codeInput).toHaveAttribute('maxLength', '6');
  });

  it('calls onSubmit and onContinue when form is valid', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    const handleContinue = vi.fn();
    render(
      <VerificationCodeState
        onContinue={handleContinue}
        onResendCode={vi.fn()}
        onSubmit={handleSubmit}
      />
    );

    await user.type(screen.getByLabelText(/verification code/i), '123456');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // Wait for first assertion only
    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        code: '123456',
      });
    });

    // Then check second assertion (no waiting needed)
    expect(handleContinue).toHaveBeenCalledTimes(1);
  });

  it('shows loading state while submitting', async () => {
    const user = userEvent.setup();
    const submitPromise = new Promise<void>(() => {
      // Never resolves - testing loading state
    });
    const handleSubmit = vi.fn(() => submitPromise);

    render(
      <VerificationCodeState
        onContinue={vi.fn()}
        onResendCode={vi.fn()}
        onSubmit={handleSubmit}
      />
    );

    await user.type(screen.getByLabelText(/verification code/i), '123456');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // Wait for loading state to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /verifying/i })).toBeDisabled();
    });
  });

  it('shows error when code is not 6 digits', async () => {
    const user = userEvent.setup();
    render(
      <VerificationCodeState
        onContinue={vi.fn()}
        onResendCode={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText(/verification code/i), '12345');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByText(/verification code must be 6 digits/i)).toBeInTheDocument();
  });

  it('prevents form submission when code contains non-numeric characters', async () => {
    const user = userEvent.setup();
    const handleContinue = vi.fn();
    const handleSubmit = vi.fn();

    render(
      <VerificationCodeState
        onContinue={handleContinue}
        onResendCode={vi.fn()}
        onSubmit={handleSubmit}
      />
    );

    await user.type(screen.getByLabelText(/verification code/i), '12345a');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // Form should not progress when validation fails
    expect(handleSubmit).not.toHaveBeenCalled();
    expect(handleContinue).not.toHaveBeenCalled();
  });

  it('shows error when code is empty', async () => {
    const user = userEvent.setup();
    render(
      <VerificationCodeState
        onContinue={vi.fn()}
        onResendCode={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByText(/verification code must be 6 digits/i)).toBeInTheDocument();
  });

  it('calls onResendCode when resend button is clicked', async () => {
    const user = userEvent.setup();
    const handleResendCode = vi.fn();
    render(
      <VerificationCodeState
        onContinue={vi.fn()}
        onResendCode={handleResendCode}
      />
    );

    await user.click(screen.getByRole('button', { name: /resend code/i }));

    expect(handleResendCode).toHaveBeenCalledTimes(1);
  });

  it('has accessible verification code input with proper label', () => {
    render(
      <VerificationCodeState
        onContinue={vi.fn()}
        onResendCode={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/verification code/i)).toHaveAttribute('type', 'text');
  });
});

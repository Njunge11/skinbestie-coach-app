import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { PasswordResetSuccessState } from './password-reset-success-state';

describe('PasswordResetSuccessState', () => {
  it('renders success message with heading and description', () => {
    render(<PasswordResetSuccessState onBackToLogin={vi.fn()} />);

    expect(screen.getByRole('heading')).toHaveTextContent(/password reset successful/i);
    expect(
      screen.getByText(/your password has been updated successfully/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument();
  });

  it('renders success icon (outline circle with checkmark)', () => {
    const { container } = render(<PasswordResetSuccessState onBackToLogin={vi.fn()} />);

    // Check that SVG exists
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();

    // Check for circle element (outline)
    const circle = svg?.querySelector('circle');
    expect(circle).toBeInTheDocument();
    expect(circle).toHaveAttribute('cx', '12');
    expect(circle).toHaveAttribute('cy', '12');
    expect(circle).toHaveAttribute('r', '10');

    // Check for checkmark path
    const path = svg?.querySelector('path');
    expect(path).toBeInTheDocument();
    expect(path).toHaveAttribute('d', 'M9 12l2 2 4-4');
  });

  it('calls onBackToLogin when back to login button is clicked', async () => {
    const user = userEvent.setup();
    const handleBackToLogin = vi.fn();
    render(<PasswordResetSuccessState onBackToLogin={handleBackToLogin} />);

    await user.click(screen.getByRole('button', { name: /back to login/i }));

    expect(handleBackToLogin).toHaveBeenCalledTimes(1);
  });

  it('has accessible back to login button', () => {
    render(<PasswordResetSuccessState onBackToLogin={vi.fn()} />);

    const button = screen.getByRole('button', { name: /back to login/i });
    expect(button).toHaveAttribute('type', 'button');
  });
});

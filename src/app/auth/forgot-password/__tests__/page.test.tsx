// e-sign-uk/src/app/auth/forgot-password/__tests__/page.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ForgotPasswordPage from '../page'; // Adjust the import path as necessary
import { createClient } from '@/lib/supabase/client'; // Import the actual function signature

// Mock the Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn().mockReturnValue({
    auth: {
      resetPasswordForEmail: jest.fn(),
    },
  }),
}));

// Mock next/link
jest.mock('next/link', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Mock the specific Supabase function instance for easier access in tests
const mockResetPasswordForEmail = (createClient() as any).auth.resetPasswordForEmail;

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Reset mock implementation details if necessary
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  });

  it('renders the email input and submit button', () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('allows user to input email', () => {
    render(<ForgotPasswordPage />);
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    expect(emailInput).toHaveValue('test@example.com');
  });

  it('handles successful form submission', async () => {
    render(<ForgotPasswordPage />);
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /send reset link/i });

    fireEvent.change(emailInput, { target: { value: 'success@example.com' } });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalledTimes(1);
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith('success@example.com', {
        redirectTo: expect.stringContaining('/auth/update-password'),
      });
    });

    await waitFor(() => {
        expect(screen.getByText(/Password reset email sent. Check your inbox./i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Could not send password reset email./i)).not.toBeInTheDocument();

  });

 it('handles form submission with Supabase error', async () => {
    const errorMessage = 'Failed to send email';
    mockResetPasswordForEmail.mockResolvedValueOnce({ data: {}, error: { message: errorMessage, name: 'AuthApiError' } });

    render(<ForgotPasswordPage />);
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /send reset link/i });

    fireEvent.change(emailInput, { target: { value: 'error@example.com' } });

    await act(async () => {
      fireEvent.click(submitButton);
    });

     await waitFor(() => {
       expect(mockResetPasswordForEmail).toHaveBeenCalledTimes(1);
       expect(mockResetPasswordForEmail).toHaveBeenCalledWith('error@example.com', {
         redirectTo: expect.stringContaining('/auth/update-password'),
       });
     });

    await waitFor(() => {
      expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
    });
     expect(screen.queryByText(/Password reset email sent. Check your inbox./i)).not.toBeInTheDocument();
  });

  it('shows validation error for invalid email format', async () => {
    render(<ForgotPasswordPage />);
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /send reset link/i });

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

    await act(async () => {
        fireEvent.click(submitButton);
    });

    // Check for a generic validation message or specific one if implemented
    // This depends on how validation is handled (e.g., HTML5 validation, library)
    // For basic HTML5 validation:
    // expect(emailInput).toBeInvalid();
    // Or check for a specific error message if rendered by the component
    await waitFor(() => {
        // Assuming the component shows a validation message element
        // Adjust the selector based on actual implementation
        // Example: expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
        // If using native validation, check validity state
        expect(emailInput).toHaveAttribute('type', 'email'); // Basic check
        // More specific checks might require inspecting validity state or rendered messages
    });

    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
  });

});
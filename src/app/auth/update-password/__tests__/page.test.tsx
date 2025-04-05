// e-sign-uk/src/app/auth/update-password/__tests__/page.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import UpdatePasswordPage from '../page'; // Adjust the import path as necessary
// Import the function signature first
import { createClient as createClientType } from '@/lib/supabase/client';

// Mock the entire module
jest.mock('@/lib/supabase/client');

// Now import the mocked function
import { createClient } from '@/lib/supabase/client';

// Type assertion for the mocked function
const mockedCreateClient = jest.mocked(createClient);
const mockUpdateUser = jest.fn();
const mockGetSession = jest.fn(); // Mock for getSession

// Set up the mock return value structure including getSession
mockedCreateClient.mockReturnValue({
  auth: {
    updateUser: mockUpdateUser,
    getSession: mockGetSession, // Add the getSession mock
    // Add other auth methods used by the component if necessary, mocking them as well
    // e.g., signOut: jest.fn(), getUser: jest.fn(), etc.
  },
  // Add other Supabase client parts if necessary
} as unknown as ReturnType<typeof createClientType>); // Cast to the original type structure

// Mock next/navigation
const mockRouterPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

describe('UpdatePasswordPage', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Default mock implementation for success using the correctly referenced mock
    mockUpdateUser.mockResolvedValue({ data: { user: {} }, error: null });
    // Default mock for getSession to simulate an authenticated user
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'test-user-id' } } }, error: null });
    // Ensure real timers are used by default
    jest.useRealTimers();
  });

  it('renders password, confirm password fields and submit button', async () => {
    // Wrap initial render in act for async useEffect
    await act(async () => {
      render(<UpdatePasswordPage />);
    });
    // Removed duplicate render call
    // Wait for the loading state to resolve and the form to appear
    await waitFor(() => {
      // Use more specific label text for the first password field
      expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument();
    });
  });

  it('allows user to input passwords', async () => {
    // Wrap initial render in act
    await act(async () => {
      render(<UpdatePasswordPage />);
    });
    // Removed duplicate render call

    // Wait for the form elements to appear
    // Wait for the form elements to appear
    await waitFor(() => {
        // Use more specific label text
        expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    });

    const passwordInput = screen.getByLabelText(/^new password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);

    fireEvent.change(passwordInput, { target: { value: 'newSecurePassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newSecurePassword123' } });

    expect(passwordInput).toHaveValue('newSecurePassword123');
    expect(confirmPasswordInput).toHaveValue('newSecurePassword123');
  });

  it('shows validation error if passwords do not match', async () => {
    // Wrap initial render in act
    await act(async () => {
      render(<UpdatePasswordPage />);
    });
    // Removed duplicate render call

    // Wait for form elements
    await waitFor(() => {
        // Use more specific label text
        expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    });

    const passwordInput = screen.getByLabelText(/^new password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
    const submitButton = screen.getByRole('button', { name: /update password/i });

    fireEvent.change(passwordInput, { target: { value: 'passwordA' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'passwordB' } });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      // Check for the specific error message displayed by the component
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
    });
    // Check the correctly referenced mock
    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('shows validation error if password is too short', async () => {
    // Wrap initial render in act
    await act(async () => {
      render(<UpdatePasswordPage />);
    });
    // Removed duplicate render call

     // Wait for form elements
    await waitFor(() => {
        // Use more specific label text
        expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    });

    const passwordInput = screen.getByLabelText(/^new password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
    const submitButton = screen.getByRole('button', { name: /update password/i });

    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'short' } });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      // Check for the specific error message (adjust based on implementation)
      expect(screen.getByText(/Password must be at least 6 characters long/i)).toBeInTheDocument();
    });
    // Check the correctly referenced mock
    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });


  it('handles successful password update', async () => {
    // Use fake timers for this test to control setTimeout
    jest.useFakeTimers();

    // Wrap initial render in act
    await act(async () => {
      render(<UpdatePasswordPage />);
    });
    // Removed duplicate render call

    // Wait for form elements
    await waitFor(() => {
        // Use more specific label text
        expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    });

    const passwordInput = screen.getByLabelText(/^new password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
    const submitButton = screen.getByRole('button', { name: /update password/i });
    const newPassword = 'newSecurePassword123';

    fireEvent.change(passwordInput, { target: { value: newPassword } });
    fireEvent.change(confirmPasswordInput, { target: { value: newPassword } });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      // Check the correctly referenced mock
      expect(mockUpdateUser).toHaveBeenCalledTimes(1);
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: newPassword });
    });

    await waitFor(() => {
      // Match the actual success message
      expect(screen.getByText(/Password updated successfully. You can now log in./i)).toBeInTheDocument();
    });

    // Advance timers to trigger the setTimeout for router.push
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    // Now check if the router was called
    expect(mockRouterPush).toHaveBeenCalledTimes(1);
    expect(mockRouterPush).toHaveBeenCalledWith('/auth/login');

    // Restore real timers
    jest.useRealTimers();
  });

  it('handles password update with Supabase error', async () => {
    // Wrap initial render in act
    await act(async () => {
      render(<UpdatePasswordPage />);
    });
    const errorMessage = 'Failed to update password';
    // Set mock implementation on the correctly referenced mock
    mockUpdateUser.mockResolvedValueOnce({ data: {}, error: { message: errorMessage, name: 'AuthApiError' } });

    // Removed duplicate render call

    // Wait for form elements
    await waitFor(() => {
        // Use more specific label text
        expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    });

    const passwordInput = screen.getByLabelText(/^new password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
    const submitButton = screen.getByRole('button', { name: /update password/i });
    const newPassword = 'errorPassword123';

    fireEvent.change(passwordInput, { target: { value: newPassword } });
    fireEvent.change(confirmPasswordInput, { target: { value: newPassword } });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      // Check the correctly referenced mock
      expect(mockUpdateUser).toHaveBeenCalledTimes(1);
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: newPassword });
    });

    await waitFor(() => {
      // Match the actual error message format
      expect(screen.getByText(`Error updating password: ${errorMessage}`)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Password updated successfully/i)).not.toBeInTheDocument();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});
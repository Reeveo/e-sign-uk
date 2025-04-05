import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../page'; // Adjust path if needed

// --- Mocks ---
const mockPush = jest.fn();
const mockRefresh = jest.fn();
const mockSignInWithPassword = jest.fn();

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  }),
}));

// Mock next/link
jest.mock('next/link', () => {
    return ({ children, href }: { children: React.ReactNode; href: string }) => {
      return <a href={href}>{children}</a>;
    };
});
// --- End Mocks ---

describe('Login Page', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockPush.mockClear();
    mockRefresh.mockClear();
    mockSignInWithPassword.mockClear();
  });

  it('renders the login form elements', () => {
    render(<LoginPage />);
    expect(screen.getByRole('heading', { name: /Sign in to your account/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/^Password$/i)).toBeInTheDocument(); // Use regex for exact match if needed
    expect(screen.getByRole('button', { name: /Sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create an account/i })).toBeInTheDocument();
  });

  it('allows typing into email and password fields', () => {
    render(<LoginPage />);
    const emailInput = screen.getByPlaceholderText(/Email address/i);
    const passwordInput = screen.getByPlaceholderText(/^Password$/i);

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('calls supabase signInWithPassword and redirects on successful login', async () => {
    // Mock successful login
    mockSignInWithPassword.mockResolvedValueOnce({ data: { user: {}, session: {} }, error: null });

    render(<LoginPage />);
    const emailInput = screen.getByPlaceholderText(/Email address/i);
    const passwordInput = screen.getByPlaceholderText(/^Password$/i);
    const submitButton = screen.getByRole('button', { name: /Sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledTimes(1);
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    await waitFor(() => {
        expect(screen.getByText(/Login successful! Redirecting.../i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith('/');
      expect(mockRefresh).toHaveBeenCalledTimes(1); // Check if refresh is called
    });
  });

  it('shows "Invalid email or password" error on specific auth error', async () => {
    // Mock failed login (invalid credentials)
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials', name: 'AuthApiError' },
    });

    render(<LoginPage />);
    const emailInput = screen.getByPlaceholderText(/Email address/i);
    const passwordInput = screen.getByPlaceholderText(/^Password$/i);
    const submitButton = screen.getByRole('button', { name: /Sign in/i });

    fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledTimes(1);
    });

    // Check if the specific error message is displayed
    expect(await screen.findByText(/Invalid email or password/i)).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled(); // Ensure redirection didn't happen
  });

   it('shows generic error message on other auth errors', async () => {
    // Mock failed login (generic error)
    const genericErrorMessage = 'Something went wrong';
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: genericErrorMessage, name: 'AuthApiError' },
    });

    render(<LoginPage />);
    // Add valid input before submitting for this test case
    fireEvent.change(screen.getByPlaceholderText(/Email address/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/^Password$/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign in/i })); // Click submit

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledTimes(1);
    });

    // Check if the generic error message is displayed
    expect(await screen.findByText(genericErrorMessage)).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

});
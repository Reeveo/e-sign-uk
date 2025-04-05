import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'; // Import act
import RegisterPage from '../page'; // Adjust path if needed

// --- Mocks ---
const mockSignUp = jest.fn();

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signUp: mockSignUp,
    },
  }),
}));

// Mock next/link (if used, though not currently on register page itself)
jest.mock('next/link', () => {
    return ({ children, href }: { children: React.ReactNode; href: string }) => {
      return <a href={href}>{children}</a>;
    };
});
// --- End Mocks ---

describe('Register Page', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockSignUp.mockClear();
  });

  it('renders the registration form elements', () => {
    render(<RegisterPage />);
    expect(screen.getByRole('heading', { name: /Create your account/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Password \(min. 6 characters\)/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Confirm Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Register/i })).toBeInTheDocument();
  });

  it('allows typing into email and password fields', () => {
    render(<RegisterPage />);
    const emailInput = screen.getByPlaceholderText(/Email address/i);
    const passwordInput = screen.getByPlaceholderText(/Password \(min. 6 characters\)/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/Confirm Password/i);

    fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });

    expect(emailInput).toHaveValue('newuser@example.com');
    expect(passwordInput).toHaveValue('newpassword123');
    expect(confirmPasswordInput).toHaveValue('newpassword123');
  });

  // Test 'shows error if passwords do not match' removed - covered by hook test.

  // Test 'shows error if password is too short' removed - covered by hook test.


  it('calls supabase signUp and shows success message on valid registration', async () => {
    // Mock successful sign up
    mockSignUp.mockResolvedValueOnce({ data: { user: {}, session: {} }, error: null });

    render(<RegisterPage />);
    const emailInput = screen.getByPlaceholderText(/Email address/i);
    const passwordInput = screen.getByPlaceholderText(/Password \(min. 6 characters\)/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/Confirm Password/i);
    const submitButton = screen.getByRole('button', { name: /Register/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledTimes(1);
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    // Check for success message
    expect(await screen.findByText(/Registration submitted!/i)).toBeInTheDocument();

    // Check if form fields are cleared (optional but good practice)
    expect(emailInput).toHaveValue('');
    expect(passwordInput).toHaveValue('');
    expect(confirmPasswordInput).toHaveValue('');
  });

  it('shows error message on Supabase signUp error', async () => {
    // Mock failed sign up
    const errorMessage = 'User already registered';
    mockSignUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: errorMessage, name: 'AuthApiError' },
    });

    render(<RegisterPage />);
    const emailInput = screen.getByPlaceholderText(/Email address/i);
    const passwordInput = screen.getByPlaceholderText(/Password \(min. 6 characters\)/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/Confirm Password/i);
    const submitButton = screen.getByRole('button', { name: /Register/i });

    fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledTimes(1);
    });

    // Check if the error message from Supabase is displayed
    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
  });

});
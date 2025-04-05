// e-sign-uk/src/lib/supabase/__mocks__/client.ts
import { jest } from '@jest/globals';
import type {
    AuthResponse,
    AuthError,
    UserResponse,
    // SessionResponse removed - incorrect type
    User,
    Session,
    SignInWithPasswordCredentials,
    SignUpWithPasswordCredentials,
    UserAttributes,
    // GetSessionResponse removed - incorrect type
    AuthChangeEvent, // Import AuthChangeEvent
} from '@supabase/supabase-js';

// Define the expected resolved value structure for simpler typing
type SupabaseAuthSuccess<T> = { data: T; error: null };
type SupabaseAuthError = { data: { user: null; session: null; }; error: AuthError }; // Adjust based on specific function error shapes if needed
type SupabaseSignOutResponse = { error: AuthError | null };
type SupabaseEmptyDataResponse = { data: object; error: AuthError | null }; // For resetPasswordForEmail

// Create typed individual mocks for each function we need
// Define the return structure for getSession directly in the type
export const mockGetSession = jest.fn<() => Promise<{ data: { session: Session | null }; error: AuthError | null }>>();
export const mockUpdateUser = jest.fn<(attributes: UserAttributes) => Promise<UserResponse>>();
export const mockResetPasswordForEmail = jest.fn<(email: string, options?: { redirectTo?: string }) => Promise<SupabaseEmptyDataResponse>>();
export const mockSignInWithPassword = jest.fn<(credentials: SignInWithPasswordCredentials) => Promise<AuthResponse>>();
export const mockSignUp = jest.fn<(credentials: SignUpWithPasswordCredentials) => Promise<AuthResponse>>();
// Correct type for getUser mock
export const mockGetUser = jest.fn<() => Promise<UserResponse>>();
export const mockSignOut = jest.fn<() => Promise<SupabaseSignOutResponse>>();
// Mock for onAuthStateChange
export const mockUnsubscribe = jest.fn();
export const mockOnAuthStateChange = jest.fn<(callback: (event: AuthChangeEvent, session: Session | null) => void) => { data: { subscription: { unsubscribe: jest.Mock } } }>()
  .mockReturnValue({ data: { subscription: { unsubscribe: mockUnsubscribe } } });

// Mock the overall createClient function
export const createClient = jest.fn().mockReturnValue({
  auth: {
    getSession: mockGetSession,
    updateUser: mockUpdateUser,
    resetPasswordForEmail: mockResetPasswordForEmail,
    signInWithPassword: mockSignInWithPassword,
    signUp: mockSignUp,
    getUser: mockGetUser,
    signOut: mockSignOut,
    onAuthStateChange: mockOnAuthStateChange, // Add the mock here
  },
  // Add other top-level Supabase client properties if needed by any component
});

// Provide sensible defaults - tests can override these using mockResolvedValueOnce etc.
// Provide sensible defaults matching the types
mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
// Provide a default User object when error is null to satisfy UserResponse type
mockGetUser.mockResolvedValue({ data: { user: {} as User }, error: null });
mockSignOut.mockResolvedValue({ error: null });
// Cast empty user/session objects to satisfy the stricter types if needed, or use null/partial mocks
mockUpdateUser.mockResolvedValue({ data: { user: {} as User }, error: null });
mockSignInWithPassword.mockResolvedValue({ data: { user: {} as User, session: {} as Session }, error: null });
mockSignUp.mockResolvedValue({ data: { user: {} as User, session: {} as Session }, error: null });
mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
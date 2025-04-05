import { renderHook, act } from '@testing-library/react';
import { useRegisterForm } from '../useRegisterForm';

// Mock Supabase client (needed by the hook)
const mockSignUp = jest.fn();
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signUp: mockSignUp,
    },
  }),
}));

// Mock event object
const mockPreventDefault = jest.fn(); // Create mock function separately
const mockEvent = {
  preventDefault: mockPreventDefault,
} as unknown as React.FormEvent<HTMLFormElement>;


describe('useRegisterForm Hook', () => {
  beforeEach(() => {
    mockSignUp.mockClear();
    mockPreventDefault.mockClear(); // Clear the separate mock function
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useRegisterForm());

    expect(result.current.email).toBe('');
    expect(result.current.password).toBe('');
    expect(result.current.confirmPassword).toBe('');
    expect(result.current.error).toBeNull();
    expect(result.current.message).toBeNull();
  });

  it('should update email state', () => {
    const { result } = renderHook(() => useRegisterForm());

    act(() => {
      result.current.setEmail('test@example.com');
    });

    expect(result.current.email).toBe('test@example.com');
  });

  // Similar tests can be added for setPassword and setConfirmPassword

  it('should set error if passwords do not match on handleRegister', async () => {
    const { result } = renderHook(() => useRegisterForm());

    act(() => {
      result.current.setPassword('password123');
      result.current.setConfirmPassword('password456'); // Mismatch
    });

    await act(async () => {
      await result.current.handleRegister(mockEvent);
    });

    expect(result.current.error).toBe('Passwords do not match.');
    expect(result.current.message).toBeNull();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('should set error if password is too short on handleRegister', async () => {
    const { result } = renderHook(() => useRegisterForm());

    act(() => {
      result.current.setPassword('short');
      result.current.setConfirmPassword('short');
    });

    await act(async () => {
      await result.current.handleRegister(mockEvent);
    });

    expect(result.current.error).toBe('Password must be at least 6 characters long.');
    expect(result.current.message).toBeNull();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('should call signUp and set message on successful registration', async () => {
    mockSignUp.mockResolvedValueOnce({ data: {}, error: null });
    const { result } = renderHook(() => useRegisterForm());

    act(() => {
      result.current.setEmail('test@example.com');
      result.current.setPassword('password123');
      result.current.setConfirmPassword('password123');
    });

    await act(async () => {
      await result.current.handleRegister(mockEvent);
    });

    expect(mockSignUp).toHaveBeenCalledTimes(1);
    expect(mockSignUp).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' });
    expect(result.current.error).toBeNull();
    expect(result.current.message).toMatch(/Registration submitted!/i);
    // Check if state is reset
    expect(result.current.email).toBe('');
    expect(result.current.password).toBe('');
    expect(result.current.confirmPassword).toBe('');
  });

  it('should set error on signUp failure', async () => {
    const errorMessage = 'Supabase error';
    mockSignUp.mockResolvedValueOnce({ data: {}, error: { message: errorMessage, name: 'AuthApiError' } });
    const { result } = renderHook(() => useRegisterForm());

    act(() => {
      result.current.setEmail('test@example.com');
      result.current.setPassword('password123');
      result.current.setConfirmPassword('password123');
    });

    await act(async () => {
      await result.current.handleRegister(mockEvent);
    });

    expect(mockSignUp).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBe(errorMessage);
    expect(result.current.message).toBeNull();
  });

});
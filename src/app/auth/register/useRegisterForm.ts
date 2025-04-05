import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useRegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null); // Reset errors on new submission
    setMessage(null); // Reset message on new submission

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    // Attempt sign up
    try {
        const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (signUpError) {
            // Throw the error to be caught below
            throw signUpError;
        }

        // Success case
        setMessage('Registration submitted! Please check your email to confirm your account (if email confirmation is enabled in Supabase settings).');
        setEmail('');
        setPassword('');
        setConfirmPassword('');

    } catch (error: any) {
        console.error('Registration error:', error);
        setError(error.message || 'An unexpected error occurred during registration.');
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    error,
    message,
    handleRegister,
  };
}
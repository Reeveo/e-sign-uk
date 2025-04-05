// e-sign-uk/src/app/auth/register/page.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client'; // Use the alias

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
    }

    // Attempt sign up
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      // Supabase handles email confirmation flow based on project settings.
      // For local dev, check Inbucket (http://127.0.0.1:54324) if confirmation is enabled.
    });

    if (signUpError) {
      console.error('Registration error:', signUpError);
      setError(signUpError.message);
    } else {
      // Check Supabase project settings -> Authentication -> Email Templates
      // to see if "Confirm email" is enabled.
      setMessage('Registration submitted! Please check your email to confirm your account (if email confirmation is enabled in Supabase settings).');
      // Clear form on success
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
       <div className="w-full max-w-md space-y-8">
        <div>
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Create your account
            </h2>
        </div>
        <form onSubmit={handleRegister} className="mt-8 space-y-6">
            <div className="rounded-md shadow-sm -space-y-px">
            <div>
                <label htmlFor="email-address" className="sr-only">
                Email address
                </label>
                <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="relative block w-full appearance-none rounded-none rounded-t-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="Email address"
                />
            </div>
            <div>
                <label htmlFor="password" className="sr-only">
                Password
                </label>
                <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="relative block w-full appearance-none rounded-none border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="Password (min. 6 characters)"
                />
            </div>
             <div>
                <label htmlFor="confirm-password" className="sr-only">
                Confirm Password
                </label>
                <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="relative block w-full appearance-none rounded-none rounded-b-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="Confirm Password"
                />
            </div>
            </div>

            {error && (
            <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
                </div>
            </div>
            )}
            {message && (
             <div className="rounded-md bg-green-50 p-4">
                <div className="flex">
                <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">{message}</p>
                </div>
                </div>
            </div>
            )}

            <div>
            <button
                type="submit"
                className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
                Register
            </button>
            </div>
        </form>
       </div>
    </div>
  );
}
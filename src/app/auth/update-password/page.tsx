'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function UpdatePasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if the user is authenticated (via the password recovery link)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
      } else {
        // If no session, maybe the link expired or was invalid
        setError('Invalid or expired password reset link. Please request a new one.');
        // Optionally redirect to forgot-password page after a delay
        // setTimeout(() => router.push('/auth/forgot-password'), 5000);
      }
    };
    checkSession();
  }, [supabase.auth, router]);

  const handleUpdatePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(`Error updating password: ${updateError.message}`);
    } else {
      setMessage('Password updated successfully. You can now log in.');
      setPassword('');
      setConfirmPassword('');
      // Redirect to login after a short delay
      setTimeout(() => router.push('/auth/login'), 3000);
    }
    setLoading(false);
  };

  // Render loading or error state if not authenticated yet
  if (!isAuthenticated && !error) {
      return <div className="flex justify-center items-center min-h-screen"><p>Loading...</p></div>;
  }
   // If there was an error during session check (e.g., invalid link)
   if (error && !message) { // Show initial error prominently
    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-2">
            <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
            <p className="text-red-600 mb-4">{error}</p>
            <Link href="/auth/forgot-password" className="text-indigo-600 hover:text-indigo-500">
                Request a new password reset link
            </Link>
        </div>
        );
    }


  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-2xl font-bold mb-4">Update Password</h1>
      <form onSubmit={handleUpdatePassword} className="w-full max-w-sm">
        <div className="mb-4">
          <label htmlFor="password"className="block text-sm font-medium text-gray-700">
            New Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
            placeholder="••••••••"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="confirmPassword"className="block text-sm font-medium text-gray-700">
            Confirm New Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
            placeholder="••••••••"
          />
        </div>

        {message && <p className="text-green-600 mb-4">{message}</p>}
        {error && <p className="text-red-600 mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading || !isAuthenticated} // Disable if loading or not authenticated
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
       {/* Only show login link if password wasn't just successfully updated */}
       {!message && (
            <p className="mt-4">
                Remembered your password or need to log in?{' '}
                <Link href="/auth/login" className="text-indigo-600 hover:text-indigo-500">
                Log in
                </Link>
            </p>
        )}
    </div>
  );
}
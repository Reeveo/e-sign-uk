'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client'; // Using alias based on tsconfig likely setup
import { Session } from '@supabase/supabase-js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AuthButton() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true); // Add loading state
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    // Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setLoading(false); // Set loading to false after fetching
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      // Ensure loading is false if state changes after initial load
      if (loading) setLoading(false);
    });


    return () => {
      authListener?.subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]); // Dependency array includes supabase

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error logging out:', error);
        // Optionally: Show an error message to the user
      } else {
        router.push('/'); // Redirect to home page
        router.refresh(); // Refresh server components
      }
    } catch (error) {
        console.error('Unexpected error during logout:', error);
    }
  };

  // Optional: Render nothing or a loading indicator while checking session
  if (loading) {
    return <div className="flex items-center gap-4 text-esign-secondary-text">Loading...</div>;
  }

  return (
    <div className="flex items-center gap-4">
      {session ? (
        <>
          <span className="text-esign-secondary-text">{session.user.email}</span>
          <Link
            href="/dashboard"
            className="esign-button-secondary"
          >
            Dashboard
          </Link>
          <button
            onClick={handleLogout}
            className="esign-button-primary"
          >
            Logout
          </button>
        </>
      ) : (
        <>
          <Link
            href="/auth/login"
            className="esign-button-primary"
          >
            Login
          </Link>
          <Link
            href="/auth/register"
            className="esign-button-secondary"
          >
            Register
          </Link>
        </>
      )}
    </div>
  );
}
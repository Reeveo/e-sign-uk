import { createClient } from '../../lib/supabase/server';
import { redirect } from 'next/navigation';
import DocumentUpload from '@/components/DocumentUpload'; // Import the new component

export default async function DashboardPage() {
  // createClient now handles cookies internally
  const supabase = createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    console.error('Dashboard auth error or no user:', error);
    redirect('/auth/login');
  }

  return (
    <div>
      <h1>Welcome to your Dashboard!</h1>
      {user.email && <p>Logged in as: {user.email}</p>}
      {/* Dashboard content will go here */}
      <hr style={{ margin: '20px 0' }} />
      <DocumentUpload userId={user.id} />
    </div>
  );
}
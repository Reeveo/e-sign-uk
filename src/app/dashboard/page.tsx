import { createClient } from '../../lib/supabase/server';
import { redirect } from 'next/navigation';
import DocumentUpload from '@/components/DocumentUpload';
import DocumentList from '@/components/DocumentList'; // Import the DocumentList component
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
   return null; // Add explicit return to stop execution after redirect
 }

  // Fetch documents for the user
  const { data: documents, error: documentsError } = await supabase
    .from('documents')
    .select('id, filename, status, created_at')
    .order('created_at', { ascending: false });

  if (documentsError) {
    console.error('Error fetching documents:', documentsError);
    // Handle error appropriately, maybe show an error message to the user
    // For now, we'll proceed with an empty array or handle it in the component
  }
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Optional Sidebar Placeholder - uncomment and style if needed later
      <div className="w-64 bg-white shadow-md hidden md:block">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-gray-700">Navigation</h2>
          {/* Navigation links go here *}
        </div>
      </div>
      */}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Dashboard Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {/* Welcome Message */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Welcome back!
              </h2>
              {user.email && (
                <p className="text-sm text-gray-600">Logged in as: {user.email}</p>
              )}
            </div>

            {/* Document Upload Section */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Upload New Document
              </h3>
              <DocumentUpload userId={user.id} />
            </div>

            {/* Document List Section */}
            <div className="mt-8 bg-white shadow rounded-lg p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Your Documents</h3>
              <DocumentList documents={documents || []} /> {/* Render DocumentList and pass documents */}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
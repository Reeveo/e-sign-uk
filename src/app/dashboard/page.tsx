import { createClient } from '../../lib/supabase/server';
import { redirect } from 'next/navigation';
import DocumentUpload from '@/components/DocumentUpload';
import DocumentList from '@/components/DocumentList';
import AuthButton from '@/components/AuthButton';

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    console.error('Dashboard auth error or no user:', error);
    redirect('/auth/login');
    return null;
  }

  // Fetch documents for the user
  const { data: documents, error: documentsError } = await supabase
    .from('documents')
    .select('id, filename, status, created_at')
    .order('created_at', { ascending: false });

  if (documentsError) {
    console.error('Error fetching documents:', documentsError);
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="w-64 bg-esign-card shadow-md hidden md:block">
        <div className="p-6">
          <h2 className="text-xl font-bold text-esign-primary-text mb-6">E-Sign UK</h2>
          
          <nav className="space-y-1">
            <a href="/dashboard" className="flex items-center px-2 py-2 text-esign-primary-text font-medium rounded-md bg-esign-background">
              Overview
            </a>
            <a href="/documents" className="flex items-center px-2 py-2 text-esign-secondary-text hover:text-esign-primary-text hover:bg-esign-background rounded-md">
              Documents
            </a>
            <a href="/templates" className="flex items-center px-2 py-2 text-esign-secondary-text hover:text-esign-primary-text hover:bg-esign-background rounded-md">
              Templates
            </a>
            <a href="/contacts" className="flex items-center px-2 py-2 text-esign-secondary-text hover:text-esign-primary-text hover:bg-esign-background rounded-md">
              Contacts
            </a>
            <a href="/settings" className="flex items-center px-2 py-2 text-esign-secondary-text hover:text-esign-primary-text hover:bg-esign-background rounded-md">
              Settings
            </a>
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Dashboard Header */}
        <header className="bg-esign-card shadow-sm p-4 flex justify-between items-center">
          <div className="md:hidden">
            <h1 className="text-xl font-bold text-esign-primary-text">E-Sign UK</h1>
          </div>
          <div className="flex-1 md:flex md:justify-between md:items-center px-4">
            <h1 className="text-xl font-semibold text-esign-primary-text hidden md:block">Overview</h1>
            <AuthButton />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Status Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="esign-card">
                <h3 className="text-lg font-medium text-esign-primary-text mb-2">Documents Waiting</h3>
                <p className="text-3xl font-bold text-esign-waiting">{
                  documents ? documents.filter(doc => doc.status === 'waiting').length : '0'
                }</p>
              </div>
              <div className="esign-card">
                <h3 className="text-lg font-medium text-esign-primary-text mb-2">Documents Completed</h3>
                <p className="text-3xl font-bold text-esign-signed">{
                  documents ? documents.filter(doc => doc.status === 'completed').length : '0'
                }</p>
              </div>
              <div className="esign-card">
                <h3 className="text-lg font-medium text-esign-primary-text mb-2">Documents Drafts</h3>
                <p className="text-3xl font-bold text-esign-draft">{
                  documents ? documents.filter(doc => doc.status === 'draft').length : '0'
                }</p>
              </div>
            </div>

            {/* Document Upload Section */}
            <div className="esign-card mb-8">
              <h3 className="text-lg font-medium text-esign-primary-text mb-4">
                Upload New Document
              </h3>
              <DocumentUpload userId={user.id} />
            </div>

            {/* Document List Section */}
            <div className="esign-card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-esign-primary-text">Your Documents</h3>
                {/* Optional: Add Sort/Filter Controls */}
              </div>
              <DocumentList documents={documents || []} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
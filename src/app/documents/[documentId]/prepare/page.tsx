// e-sign-uk/src/app/documents/[documentId]/prepare/page.tsx
import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import PdfViewer from '@/components/PdfViewer';

interface PrepareDocumentPageProps {
  params: {
    documentId: string;
  };
}

export default async function PrepareDocumentPage({ params }: PrepareDocumentPageProps) {
  const { documentId } = params;
  const supabase = createClient();

  // Fetch document data
  const { data: document, error: docError } = await supabase
    .from('documents')
    .select('id, name, storage_path, user_id')
    .eq('id', documentId)
    .single();

  // Handle document not found or access error
  if (docError || !document) {
    console.error('Error fetching document or document not found:', docError?.message);
    notFound();
  }

  const storagePath = document.storage_path;
  let signedUrl = '';
  let signedUrlError: string | null = null;

  // Generate signed URL
  if (storagePath) {
    const { data, error: urlError } = await supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, 60); // Expires in 60 seconds

    if (urlError) {
      console.error('Error generating signed URL:', urlError.message);
      signedUrlError = 'Could not load document preview.';
    } else {
      signedUrl = data.signedUrl;
    }
  } else {
    signedUrlError = 'Document path not found.';
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Prepare Document: {document.name || documentId}</h1>
      {/* Using literal && */}
      {signedUrlError && <p className="text-red-500">{signedUrlError}</p>}
      {signedUrl && !signedUrlError && (
        <div>
          <p className="text-sm text-gray-500 mb-2">Document preview:</p>
          <PdfViewer signedUrl={signedUrl} />
        </div>
      )}
      {!signedUrl && !signedUrlError && (
         <p>Loading document...</p>
      )}
    </div>
  );
}
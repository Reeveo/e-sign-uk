import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SigningArea from '@/components/SigningArea'; // We'll create this next
import { Database } from '@/types/database.types'; // Assuming standard location

type DocumentField = Database['public']['Tables']['document_fields']['Row'];

interface SigningPageProps {
  params: {
    token: string;
  };
}

export default async function SigningPage({ params }: SigningPageProps) {
  const { token } = params;
  const supabase = createClient();

  // 1. Fetch signer details using the token
  const { data: signerData, error: signerError } = await supabase
    .from('document_signers')
    .select('id, document_id, signer_email, token_status, token_expires_at')
    .eq('signing_token', token)
    .maybeSingle();

  if (signerError) {
    console.error('Error fetching signer data:', signerError);
    // Consider a more user-friendly error page/message
    return notFound();
  }

  // 2. Validate the token
  if (!signerData) {
    console.warn(`Signer data not found for token: ${token}`);
    return <div className="p-4 text-red-600">Invalid signing link.</div>; // Or use notFound()
  }

  if (signerData.token_status !== 'pending') {
    console.warn(`Token status is not pending for token: ${token}`);
    return <div className="p-4 text-red-600">This signing link has already been used or is inactive.</div>;
  }

  const now = new Date();
  const expiresAt = new Date(signerData.token_expires_at);

  if (now > expiresAt) {
    console.warn(`Token expired for token: ${token}`);
    // Optionally update token status in DB here
    return <div className="p-4 text-red-600">This signing link has expired.</div>;
  }

  const { document_id, signer_email } = signerData;

  // 3. Fetch document details
  const { data: documentData, error: documentError } = await supabase
    .from('documents')
    .select('name, storage_path')
    .eq('id', document_id)
    .single(); // Use single() as document_id should be unique

  if (documentError || !documentData) {
    console.error('Error fetching document data:', documentError);
    return notFound(); // Document associated with the token not found
  }

  const { name: documentName, storage_path } = documentData;

  // 4. Fetch fields assigned to this signer
  const { data: fieldsData, error: fieldsError } = await supabase
    .from('document_fields')
    .select('*') // Select all columns for now
    .eq('document_id', document_id)
    .eq('assigned_to_email', signer_email);

  if (fieldsError) {
    console.error('Error fetching document fields:', fieldsError);
    // Decide how to handle this - maybe proceed without fields? Or show error?
    // For now, let's proceed but log the error. A production app might need a better strategy.
  }

  const fields: DocumentField[] = fieldsData || [];

  // 5. Generate signed URL for the document
  const { data: signedUrlData, error: signedUrlError } = await supabase
    .storage
    .from('documents')
    .createSignedUrl(storage_path, 60 * 60); // Signed URL valid for 1 hour

  if (signedUrlError || !signedUrlData) {
    console.error('Error creating signed URL:', signedUrlError);
    // This is critical, likely need to show an error or use notFound()
    return <div className="p-4 text-red-600">Could not load the document. Please try again later.</div>;
  }

  const { signedUrl } = signedUrlData;

  // 6. Pass data to the Client Component
  return (
    <SigningArea
      signedUrl={signedUrl}
      documentName={documentName}
      signerEmail={signer_email}
      fields={fields}
    />
  );
}
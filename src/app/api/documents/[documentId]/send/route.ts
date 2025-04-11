import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import crypto from 'crypto'; // For token generation
import { sendEmail } from '@/lib/email/sendEmail'; // Import the email utility
import { InvitationEmail } from '@/components/email/InvitationEmail'; // Import the email template

export async function POST(
  request: Request,
  { params }: { params: { documentId: string } }
) {
  const supabase = createClient(); // Corrected: No argument needed
  const { documentId } = params;

  try {
    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch document and verify ownership & status
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, user_id, status, name') // Fetch document name
      .eq('id', documentId)
      .single();

    if (docError) {
      console.error('Error fetching document:', docError);
      return NextResponse.json(
        { error: 'Document not found or error fetching.' },
        { status: 404 }
      );
    }

    if (!document) {
        return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }

    if (document.user_id !== user.id) {
      console.error('User does not own the document:', document.user_id, user.id);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (document.status !== 'ready_to_send') {
      console.warn('Document not ready to send:', document.status);
      return NextResponse.json(
        { error: `Document is not ready to send. Current status: ${document.status}` },
        { status: 400 }
      );
    }

    // 3. Fetch the first signer
    const { data: firstSigner, error: signerError } = await supabase
      .from('document_signers')
      .select('id, email') // Select id and email
      .eq('document_id', documentId)
      .eq('order', 1)
      .single();

    if (signerError || !firstSigner) {
      console.error('Error fetching first signer:', signerError);
      return NextResponse.json(
        { error: 'First signer not found or error fetching.' },
        { status: 404 }
      );
    }

    // 4. Generate unique signing token
    const signingToken = crypto.randomUUID();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7); // Token expires in 7 days

    // 5. Persist signing token for the first signer
    const { error: updateSignerError } = await supabase
      .from('document_signers')
      .update({
        signing_token: signingToken,
        token_status: 'pending', // Explicitly set status
        token_expires_at: expiryDate.toISOString(),
      })
      .eq('id', firstSigner.id); // Use the specific signer's ID

    if (updateSignerError) {
      console.error('Error updating signer with token:', updateSignerError);
      return NextResponse.json(
        { error: 'Failed to store signing token.' },
        { status: 500 }
      );
    }

    // 6. Construct signing URL (Replace with your actual domain)
    const signingUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/sign/${signingToken}`;

    // 7. Update document status to 'sent'
    const { error: updateDocStatusError } = await supabase
      .from('documents')
      .update({ status: 'sent' })
      .eq('id', documentId);

    if (updateDocStatusError) {
      // Attempt to rollback token? Maybe not critical here, but log it.
      console.error('Error updating document status to sent:', updateDocStatusError);
      // Don't necessarily fail the whole request, but log the inconsistency.
    }

    // 8. Send invitation email using Resend
    const { error: emailError } = await sendEmail({
      to: firstSigner.email,
      subject: `Invitation to Sign: ${document.name || 'Document'}`,
      react: InvitationEmail({
        signingUrl: signingUrl,
        documentName: document.name || 'Document',
        // Optionally add sender name if available/desired
        // senderName: user.email || 'Someone',
      }),
    });

    if (emailError) {
      // Log the error but don't necessarily fail the request,
      // as the document is marked as 'sent' in the DB.
      console.error(`Failed to send invitation email to ${firstSigner.email}:`, emailError);
    } else {
      console.log(`Successfully sent invitation email to ${firstSigner.email}`);
    }

    // 9. Return success
    return NextResponse.json({ message: 'Document sent successfully to the first signer.' }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in /send route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
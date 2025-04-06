import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Database } from '@/types/database.types';
import crypto from 'crypto'; // Import crypto for token generation

type FieldDataMap = { [fieldId: string]: string | null }; // Assuming fieldId is string, value can be string or null

export async function POST(
    request: NextRequest,
    { params }: { params: { token: string } }
) {
    const cookieStore = cookies();
    const supabase = createClient();
    const { token } = params;

    if (!token) {
        return NextResponse.json({ error: 'Missing signing token' }, { status: 400 });
    }

    let fieldDataMap: FieldDataMap;
    try {
        fieldDataMap = await request.json();
        if (!fieldDataMap || typeof fieldDataMap !== 'object') {
            throw new Error('Invalid request body format.');
        }
    } catch (error) {
        return NextResponse.json({ error: 'Invalid request body. Expected JSON object.' }, { status: 400 });
    }

    // Get IP address
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null;

    try {
        // 1. Validate token and get signer/document info
        const { data: signerData, error: signerError } = await supabase
            .from('document_signers')
            .select('id, document_id, signer_email, token_status, order') // Added order
            .eq('signing_token', token)
            .maybeSingle();

        if (signerError) throw signerError;
        if (!signerData) {
            return NextResponse.json({ error: 'Invalid or expired signing token' }, { status: 404 });
        }
        if (signerData.token_status !== 'pending') {
            return NextResponse.json({ error: `Signing status is already ${signerData.token_status}` }, { status: 400 });
        }

        const { id: signerId, document_id, signer_email, order: currentSignerOrder } = signerData; // Get order

        // 2. Fetch assigned fields for this signer and document
        const { data: assignedFields, error: fieldsError } = await supabase
            .from('document_fields')
            .select('id, type, required') // Select necessary columns
            .eq('document_id', document_id)
            .eq('assigned_to', signer_email); // Ensure fields are assigned to this specific signer

        if (fieldsError) throw fieldsError;
        if (!assignedFields) {
             // Should not happen if signer exists, but good practice
            return NextResponse.json({ error: 'Could not retrieve document fields' }, { status: 500 });
        }

        // 3. Validate submitted data against assigned fields
        const assignedFieldIds = new Set(assignedFields.map(f => f.id));
        const submittedFieldIds = Object.keys(fieldDataMap);

        for (const field of assignedFields) {
            const submittedValue = fieldDataMap[field.id];
            // Check if required field is missing or has empty value (adjust check as needed for different field types)
            if (field.required && (submittedValue === undefined || submittedValue === null || submittedValue === '')) {
                 return NextResponse.json({ error: `Required field '${field.id}' (type: ${field.type}) is missing.` }, { status: 400 });
            }
        }

        for (const submittedId of submittedFieldIds) {
            if (!assignedFieldIds.has(submittedId)) {
                console.warn(`Received data for unassigned or non-existent field ID: ${submittedId}`);
                // Decide whether to ignore or return an error. Ignoring for now.
                // return NextResponse.json({ error: `Submitted data for unassigned field ID: ${submittedId}` }, { status: 400 });
            }
        }


        // --- Database Updates (Simulating Transaction) ---
        // Ideally, use a database transaction here if Supabase RPC allows or backend structure supports it.
        // For now, perform updates sequentially.

        // 4. Update document_fields with submitted values
        const fieldUpdatePromises = Object.entries(fieldDataMap)
            .filter(([fieldId]) => assignedFieldIds.has(fieldId)) // Only update fields assigned to this signer
            .map(([fieldId, value]) =>
                supabase
                    .from('document_fields')
                    .update({ value: value }) // Ensure 'value' column exists
                    .eq('id', fieldId)
                    .eq('document_id', document_id) // Extra safety condition
                    .eq('assigned_to', signer_email) // Extra safety condition
            );

        const fieldUpdateResults = await Promise.all(fieldUpdatePromises);
        for (const result of fieldUpdateResults) {
            if (result.error) {
                console.error('Error updating document field:', result.error);
                // Consider how to handle partial failures - rollback is hard without transactions
                throw new Error(`Failed to update field: ${result.error.message}`);
            }
        }

        // 5. Update document_signers status
        const { error: updateSignerError } = await supabase
            .from('document_signers')
            .update({
                signed_at: new Date().toISOString(),
                ip_address: ip,
                token_status: 'completed'
            })
            .eq('id', signerId); // Use the primary key for the update

        if (updateSignerError) throw updateSignerError;

        // --- Workflow Progression Logic ---

        // Find the next signer in the sequence
        const { data: nextSignerData, error: nextSignerError } = await supabase
            .from('document_signers')
            .select('id, signer_email') // Select needed fields for the next signer
            .eq('document_id', document_id)
            .eq('order', currentSignerOrder + 1)
            .maybeSingle();

        if (nextSignerError) {
            console.error('Error finding next signer:', nextSignerError);
            // Log the error but proceed, as the current signer's action was successful
        }

        if (nextSignerData) {
            // Next signer exists
            const nextSigner = nextSignerData;
            const newSigningToken = crypto.randomUUID(); // Generate a secure token
            const tokenExpiry = new Date();
            tokenExpiry.setDate(tokenExpiry.getDate() + 7); // Set expiry (e.g., 7 days)

            const { error: updateNextSignerError } = await supabase
                .from('document_signers')
                .update({
                    signing_token: newSigningToken,
                    token_status: 'pending',
                    token_expires_at: tokenExpiry.toISOString(),
                })
                .eq('id', nextSigner.id);

            if (updateNextSignerError) {
                console.error('Error updating next signer token:', updateNextSignerError);
                // Log error, but don't fail the request for the current signer
            } else {
                // Construct signing URL (adjust base URL if needed)
                const signingUrl = `${request.nextUrl.origin}/sign/${newSigningToken}`;
                console.log(`--- SIMULATED EMAIL ---`);
                console.log(`To: ${nextSigner.signer_email}`);
                console.log(`Subject: Document requires your signature`);
                console.log(`Body: Please sign the document using this link: ${signingUrl}`);
                console.log(`-----------------------`);
            }
        } else {
            // No next signer, mark document as completed
            const { error: updateDocError } = await supabase
                .from('documents')
                .update({ status: 'completed' })
                .eq('id', document_id);

            if (updateDocError) {
                console.error('Error updating document status to completed:', updateDocError);
                // Log error, but don't fail the request
            } else {
                console.log(`Document ${document_id} signing process completed.`);
            }
        }

        // --- End Workflow Progression Logic ---

        return NextResponse.json({ message: 'Signing completed successfully' }, { status: 200 });

    } catch (error: any) {
        console.error('Error completing signing process:', error);
        return NextResponse.json({ error: 'An internal server error occurred', details: error.message }, { status: 500 });
    }
}
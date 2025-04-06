import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Database } from '@/types/database.types';

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
            .select('id, document_id, signer_email, token_status')
            .eq('signing_token', token)
            .maybeSingle();

        if (signerError) throw signerError;
        if (!signerData) {
            return NextResponse.json({ error: 'Invalid or expired signing token' }, { status: 404 });
        }
        if (signerData.token_status !== 'pending') {
            return NextResponse.json({ error: `Signing status is already ${signerData.token_status}` }, { status: 400 });
        }

        const { id: signerId, document_id, signer_email } = signerData;

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

        // --- End Database Updates ---

        return NextResponse.json({ message: 'Signing completed successfully' }, { status: 200 });

    } catch (error: any) {
        console.error('Error completing signing process:', error);
        return NextResponse.json({ error: 'An internal server error occurred', details: error.message }, { status: 500 });
    }
}
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Database } from '@/types/database.types';
import crypto from 'crypto'; // Import crypto for token generation
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'; // Import pdf-lib
import { Buffer } from 'buffer'; // Needed for handling binary data

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

                // --- Generate Final Document and Audit Trail ---
                try {
                    // 1. Fetch all necessary data
                    const { data: documentData, error: docError } = await supabase
                        .from('documents')
                        .select('id, name, storage_path')
                        .eq('id', document_id)
                        .single();

                    if (docError || !documentData) throw new Error(`Failed to fetch document details: ${docError?.message}`);

                    const { data: allSigners, error: signersError } = await supabase
                        .from('document_signers')
                        .select('signer_email, signed_at, ip_address')
                        .eq('document_id', document_id)
                        .eq('token_status', 'completed') // Only completed signers
                        .order('order', { ascending: true });

                    if (signersError) throw new Error(`Failed to fetch signers: ${signersError.message}`);

                    const { data: allFields, error: fieldsError } = await supabase
                        .from('document_fields')
                        .select('id, type, value, position_x, position_y, page_number, width, height') // Include dimensions
                        .eq('document_id', document_id)
                        .neq('value', null); // Only fields with values

                    if (fieldsError) throw new Error(`Failed to fetch fields: ${fieldsError.message}`);

                    // 2. Download original PDF from Storage
                    const { data: downloadData, error: downloadError } = await supabase
                        .storage
                        .from('documents') // Bucket name
                        .download(documentData.storage_path);

                    if (downloadError || !downloadData) throw new Error(`Failed to download original PDF: ${downloadError?.message}`);
                    const originalPdfBytes = await downloadData.arrayBuffer();

                    // 3. Generate Audit Trail Log
                    let auditTrailLog = `--- Audit Trail for Document: ${documentData.name} (ID: ${documentData.id}) ---\n`;
                    auditTrailLog += `Completion Time: ${new Date().toISOString()}\n\n`;
                    if (allSigners && allSigners.length > 0) {
                        allSigners.forEach((signer, index) => {
                            auditTrailLog += `Signer ${index + 1}:\n`;
                            auditTrailLog += `  Email: ${signer.signer_email}\n`;
                            auditTrailLog += `  Signed At: ${signer.signed_at}\n`;
                            auditTrailLog += `  IP Address: ${signer.ip_address}\n\n`;
                        });
                    } else {
                        auditTrailLog += "No completed signers found (this might indicate an issue).\n\n";
                    }
                    auditTrailLog += `Intent: All parties agreed to conduct this transaction electronically.\n`;
                    auditTrailLog += `--- End Audit Trail ---`;

                    console.log(auditTrailLog); // Log the audit trail

                    // 4. Modify PDF with field data
                    const pdfDoc = await PDFDocument.load(originalPdfBytes);
                    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica); // Use a standard font

                    if (allFields && allFields.length > 0) {
                        for (const field of allFields) {
                            if (field.value && field.page_number !== null && field.position_x !== null && field.position_y !== null) {
                                const page = pdfDoc.getPage(field.page_number - 1); // pdf-lib is 0-indexed
                                const { width: pageWidth, height: pageHeight } = page.getSize();

                                // Adjust Y coordinate: PDF origin (0,0) is bottom-left
                                const pdfY = pageHeight - (field.position_y + (field.height ?? 20)); // Adjust using field height (default 20 if null)

                                const options = {
                                    x: field.position_x,
                                    y: pdfY,
                                    font: helveticaFont,
                                    size: 10, // Adjust size as needed
                                    color: rgb(0, 0, 0), // Black text
                                };

                                if (field.type === 'signature' || field.type === 'initial') {
                                    if (field.value.startsWith('data:image/png;base64,')) {
                                        try {
                                            const pngImageBytes = Buffer.from(field.value.split(',')[1], 'base64');
                                            const pngImage = await pdfDoc.embedPng(pngImageBytes);
                                            // Calculate aspect ratio to fit within field bounds (optional, simple placement for now)
                                            const fieldWidth = field.width ?? 100; // Default width if null
                                            const fieldHeight = field.height ?? 40; // Default height if null
                                            page.drawImage(pngImage, {
                                                x: field.position_x,
                                                y: pdfY,
                                                width: fieldWidth,
                                                height: fieldHeight,
                                            });
                                        } catch (imgError: any) {
                                            console.error(`Error embedding image for field ${field.id}: ${imgError.message}. Falling back to text.`);
                                            // Fallback: Draw the text "Signature" or "Initial" if image fails
                                            page.drawText(field.type === 'signature' ? '[Signature]' : '[Initial]', { ...options, size: 8, color: rgb(0.5, 0.5, 0.5) });
                                        }
                                    } else {
                                        // Handle typed signature/initial as text
                                        page.drawText(field.value, options);
                                    }
                                } else if (field.type === 'date') {
                                    // Format date if needed, assuming it's stored reasonably
                                    page.drawText(field.value, options);
                                } else { // text, etc.
                                    page.drawText(field.value, options);
                                }
                            }
                        }
                    }

                    // 5. Save modified PDF to ArrayBuffer
                    const modifiedPdfBytes = await pdfDoc.save();

                    // 6. Upload modified PDF to Storage
                    const signedPdfPath = `${documentData.storage_path.replace(/\.pdf$/i, '')}_signed.pdf`;
                    const { error: uploadError } = await supabase
                        .storage
                        .from('documents')
                        .upload(signedPdfPath, modifiedPdfBytes, {
                            contentType: 'application/pdf',
                            upsert: true // Overwrite if it already exists
                        });

                    if (uploadError) {
                        throw new Error(`Failed to upload signed PDF: ${uploadError.message}`);
                    }

                    console.log(`Signed PDF generated and uploaded to: ${signedPdfPath}`);

                    // Optional: Update document record with signed path
                    // await supabase.from('documents').update({ signed_storage_path: signedPdfPath }).eq('id', document_id);


                } catch (generationError: any) {
                    console.error(`Error during final document generation for ${document_id}:`, generationError);
                    // Don't fail the entire request, but log the error.
                    // The main signing process for this user was successful.
                }
                // --- End Generate Final Document ---
            }
        }

        // --- End Workflow Progression Logic ---

        return NextResponse.json({ message: 'Signing completed successfully' }, { status: 200 });

    } catch (error: any) {
        console.error('Error completing signing process:', error);
        return NextResponse.json({ error: 'An internal server error occurred', details: error.message }, { status: 500 });
    }
}
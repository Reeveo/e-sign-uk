import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Database } from '@/types/database.types';
import crypto from 'crypto'; // Import crypto for token generation
import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib'; // Import pdf-lib
import { Buffer } from 'buffer'; // Needed for handling binary data
import { sendEmail } from '@/lib/email/sendEmail'; // Import the email utility
import { InvitationEmail } from '@/components/email/InvitationEmail'; // Import the invitation template
import { CompletionEmail } from '@/components/email/CompletionEmail'; // Import the completion template
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

        // --- Fetch Document Details (Needed for emails) ---
        const { data: documentDetails, error: docDetailsError } = await supabase
            .from('documents')
            .select('id, name, user_id, storage_path') // Select name, user_id, storage_path
            .eq('id', document_id)
            .single();

        if (docDetailsError || !documentDetails) {
            console.error('Error fetching document details for email:', docDetailsError);
            // Decide if this is fatal. For now, log and continue, emails might lack context.
            // throw new Error(`Failed to fetch document details: ${docDetailsError?.message}`);
        }
        const documentName = documentDetails?.name ?? 'Document'; // Use fetched name or default

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
                const signingUrl = `${process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin}/sign/${newSigningToken}`;

                // Send invitation email to next signer
                const { error: emailError } = await sendEmail({
                    to: nextSigner.signer_email,
                    subject: `Invitation to Sign: ${documentName}`,
                    react: <InvitationEmail // Use JSX syntax
                        signingUrl={signingUrl}
                        documentName={documentName}
                        // senderName: could fetch original sender if needed
                    />,
                });

                if (emailError) {
                    console.error(`Failed to send invitation email to next signer ${nextSigner.signer_email}:`, emailError);
                    // Log error, but don't fail the request
                } else {
                    console.log(`Successfully sent invitation email to next signer ${nextSigner.signer_email}`);
                }
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
                    // 1. Use already fetched document data
                    // const { data: documentData, error: docError } = await supabase
                    //     .from('documents')
                    //     .select('id, name, storage_path, user_id') // Added user_id to fetch creator
                    //     .eq('id', document_id)
                    //     .single();
                    // if (docError || !documentData) throw new Error(`Failed to fetch document details: ${docError?.message}`);
                    // Use documentDetails fetched earlier
                    const documentData = documentDetails;
                    if (!documentData) throw new Error(`Document details unavailable for final processing.`);


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

                    // 3. (Placeholder - Audit trail generation moved after PDF modification)

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

                    // 5. Save PDF with embedded fields
                    const modifiedPdfBytes = await pdfDoc.save();

                    // --- Generate Audit Trail PDF Page ---
                    const auditPdfDoc = await PDFDocument.create();
                    const auditFont = await auditPdfDoc.embedFont(StandardFonts.Helvetica);
                    const auditPage = auditPdfDoc.addPage();
                    const { width: auditPageWidth, height: auditPageHeight } = auditPage.getSize();
                    let yPosition = auditPageHeight - 50; // Start from top
                    const xMargin = 50;
                    const lineSpacing = 18;
                    const titleSize = 16;
                    const headingSize = 12;
                    const textSize = 10;

                    const drawTextLine = (text: string, font: PDFFont, size: number, indent = 0) => {
                        if (yPosition < 40) return; // Stop if near bottom
                        auditPage.drawText(text, {
                            x: xMargin + indent,
                            y: yPosition,
                            font: font,
                            size: size,
                            color: rgb(0, 0, 0),
                        });
                        yPosition -= lineSpacing; // Move down for next line
                    };

                    drawTextLine('Audit Trail Certificate', auditFont, titleSize);
                    yPosition -= lineSpacing; // Extra space after title

                    drawTextLine(`Document Name: ${documentData.name}`, auditFont, headingSize);
                    drawTextLine(`Document ID: ${documentData.id}`, auditFont, headingSize);
                    drawTextLine(`Completion Time: ${new Date().toISOString()}`, auditFont, headingSize);
                    yPosition -= lineSpacing; // Extra space

                    drawTextLine('Signer Activity:', auditFont, headingSize);
                    if (allSigners && allSigners.length > 0) {
                        allSigners.forEach((signer, index) => {
                            drawTextLine(`Signer ${index + 1}:`, auditFont, textSize, 10);
                            drawTextLine(`Email: ${signer.signer_email}`, auditFont, textSize, 20);
                            drawTextLine(`Signed At: ${signer.signed_at}`, auditFont, textSize, 20);
                            drawTextLine(`IP Address: ${signer.ip_address ?? 'N/A'}`, auditFont, textSize, 20);
                            yPosition -= lineSpacing * 0.5; // Space between signers
                        });
                    } else {
                        drawTextLine('No completed signers found.', auditFont, textSize, 10);
                    }
                    yPosition -= lineSpacing; // Extra space

                    drawTextLine('Consent:', auditFont, headingSize);
                    drawTextLine('All parties agreed to use electronic records and signatures for this transaction.', auditFont, textSize, 10);

                    const auditPdfBytes = await auditPdfDoc.save();
                    // --- End Audit Trail PDF Page ---


                    // --- (PDF Combination Removed) ---


                    // 6. Upload Signed PDF and Audit Certificate PDF Separately
                    const signedPdfPath = `${documentData.storage_path.replace(/\.pdf$/i, '')}_signed.pdf`;
                    const auditCertPath = `${documentData.storage_path.replace(/\.pdf$/i, '')}_audit_certificate.pdf`;

                    // Upload Signed PDF
                    const { error: uploadSignedError } = await supabase
                        .storage
                        .from('documents')
                        .upload(signedPdfPath, modifiedPdfBytes, {
                            contentType: 'application/pdf',
                            upsert: true
                        });

                    if (uploadSignedError) {
                        throw new Error(`Failed to upload signed PDF: ${uploadSignedError.message}`);
                    }
                    console.log(`Signed PDF generated and uploaded to: ${signedPdfPath}`);

                    // Upload Audit Certificate PDF
                    const { error: uploadAuditError } = await supabase
                        .storage
                        .from('documents')
                        .upload(auditCertPath, auditPdfBytes, {
                            contentType: 'application/pdf',
                            upsert: true
                        });

                     if (uploadAuditError) {
                        // Log error but don't necessarily fail the whole process if signed PDF uploaded
                        console.error(`Failed to upload audit certificate PDF: ${uploadAuditError.message}`);
                        // Depending on requirements, you might want to throw here or just log
                    } else {
                        console.log(`Audit Certificate PDF generated and uploaded to: ${auditCertPath}`);
                    }

                    // Optional: Update document record with paths (consider how to store multiple paths)
                    // await supabase.from('documents').update({ signed_storage_path: signedPdfPath, audit_storage_path: auditCertPath }).eq('id', document_id);
                    // --- Send Completion Emails ---
                    let recipients: string[] = [];
                    let creatorEmail: string | null = null;

                    // Fetch creator email (using auth.users table)
                    if (documentData.user_id) {
                        const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(documentData.user_id);

                        if (authUserError) {
                             console.error(`Error fetching creator auth user ${documentData.user_id}:`, authUserError);
                        } else if (authUser?.user?.email) {
                            creatorEmail = authUser.user.email;
                            recipients.push(creatorEmail);
                        } else {
                             console.warn(`Creator email not found for auth user ${documentData.user_id}`);
                        }
                    } else {
                        console.warn(`Document ${document_id} has no associated user_id.`);
                    }

                    // Add signer emails
                    if (allSigners) {
                        allSigners.forEach(signer => {
                            if (signer.signer_email && !recipients.includes(signer.signer_email)) {
                                recipients.push(signer.signer_email);
                            }
                        });
                    }

                    if (recipients.length > 0) {
                        console.log(`Preparing completion emails for: ${recipients.join(', ')}`);

                        // Generate signed URLs for downloads (7-day expiry)
                        const expiresIn = 60 * 60 * 24 * 7;
                        const { data: signedDocUrlData, error: signedDocUrlError } = await supabase
                            .storage
                            .from('documents')
                            .createSignedUrl(signedPdfPath, expiresIn);

                        const { data: auditCertUrlData, error: auditCertUrlError } = await supabase
                            .storage
                            .from('documents')
                            .createSignedUrl(auditCertPath, expiresIn);

                        if (signedDocUrlError || !signedDocUrlData?.signedUrl) {
                            console.error('Error generating signed URL for signed document:', signedDocUrlError);
                            // Decide how to proceed - maybe send email without link? For now, log and skip links.
                        }
                        if (auditCertUrlError || !auditCertUrlData?.signedUrl) {
                            console.error('Error generating signed URL for audit certificate:', auditCertUrlError);
                            // Log and skip link.
                        }

                        const finalSignedDocumentUrl = signedDocUrlData?.signedUrl ?? '#'; // Provide fallback
                        const finalAuditCertificateUrl = auditCertUrlData?.signedUrl ?? '#'; // Provide fallback

                        // Send email to each recipient
                        for (const recipientEmail of recipients) {
                            const { error: emailError } = await sendEmail({
                                to: recipientEmail,
                                subject: `Completed: ${documentName}`,
                                react: <CompletionEmail // Use JSX syntax
                                    documentName={documentName}
                                    signedDocumentUrl={finalSignedDocumentUrl}
                                    auditCertificateUrl={finalAuditCertificateUrl}
                                />,
                            });

                            if (emailError) {
                                console.error(`Failed to send completion email to ${recipientEmail}:`, emailError);
                            } else {
                                console.log(`Successfully sent completion email to ${recipientEmail}`);
                            }
                        }
                    } else {
                        console.warn(`No recipients found to send completion email for document ${document_id}.`);
                    }
                    // --- End Send Completion Emails ---
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
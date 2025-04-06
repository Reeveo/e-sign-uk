import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Define the expected structure for signers and fields in the request body
const signerSchema = z.object({
  email: z.string().email(),
  order: z.number().int().positive(),
  // Add name if it's part of the frontend state and needs saving
  // name: z.string().optional(),
});

const fieldSchema = z.object({
  type: z.enum(['signature', 'initials', 'text', 'date', 'checkbox']), // Match existing schema
  pageNumber: z.number().int().positive(),
  xCoordinate: z.number(), // Using number, Supabase 'real' type handles floats
  yCoordinate: z.number(),
  signerEmail: z.string().email().nullable(), // Email of the assigned signer, or null
  // Add other relevant field properties if needed (width, height, required, value)
  // width: z.number().optional(),
  // height: z.number().optional(),
  // required: z.boolean().optional().default(true),
  // value: z.string().optional(),
});

const prepareRequestBodySchema = z.object({
  signers: z.array(signerSchema),
  fields: z.array(fieldSchema),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  // No need to pass cookieStore, createClient handles it
  const supabase = createClient();
  const { documentId } = params;

  try {
    // 1. Get User Session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      console.error('Authentication error:', sessionError);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const userId = session.user.id;

    // 2. Verify Document Ownership
    const { data: document, error: ownerError } = await supabase
      .from('documents')
      .select('id, user_id')
      .eq('id', documentId)
      .eq('user_id', userId)
      .maybeSingle(); // Use maybeSingle to handle null case gracefully

    if (ownerError) {
      console.error('Error fetching document owner:', ownerError);
      return NextResponse.json({ error: 'Database error checking ownership' }, { status: 500 });
    }
    if (!document) {
      console.warn(`User ${userId} attempted to access unauthorized/non-existent document ${documentId}`);
      return NextResponse.json({ error: 'Document not found or not authorized' }, { status: 404 }); // Or 403
    }

    // 3. Parse and Validate Request Body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validationResult = prepareRequestBodySchema.safeParse(requestBody);
    if (!validationResult.success) {
      console.error('Validation errors:', validationResult.error.errors);
      return NextResponse.json({ error: 'Invalid request body', details: validationResult.error.errors }, { status: 400 });
    }

    const { signers: validatedSigners, fields: validatedFields } = validationResult.data;

    // Ensure unique order for signers in the input
    const orders = new Set(validatedSigners.map((s: z.infer<typeof signerSchema>) => s.order));
    if (orders.size !== validatedSigners.length) {
        return NextResponse.json({ error: 'Duplicate signer order values provided' }, { status: 400 });
    }

    // 4. Database Transaction
    const { error: transactionError } = await supabase.rpc('save_document_preparation', {
        p_document_id: documentId,
        p_user_id: userId, // Pass user_id for potential RLS checks within the function
        p_signers: validatedSigners.map((s: z.infer<typeof signerSchema>) => ({
            email: s.email,
            signing_order: s.order,
            // name: s.name // Include if needed
        })),
        p_fields: validatedFields.map((f: z.infer<typeof fieldSchema>) => ({
            type: f.type,
            page_number: f.pageNumber,
            position_x: f.xCoordinate,
            position_y: f.yCoordinate,
            signer_email: f.signerEmail, // Pass email, function will resolve to signer_id
            // width: f.width, // Include if needed
            // height: f.height,
            // required: f.required,
            // value: f.value,
        })),
        p_new_status: 'ready_to_send'
    });


    if (transactionError) {
      console.error('Error during save_document_preparation transaction:', transactionError);
      // Check for specific errors if needed (e.g., unique constraint violations)
      return NextResponse.json({ error: 'Failed to save document preparation state', details: transactionError.message }, { status: 500 });
    }

    // 5. Return Success
    return NextResponse.json({ message: 'Document preparation saved successfully' }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in PUT /api/documents/[documentId]/prepare:', error);
    return NextResponse.json({ error: 'An unexpected server error occurred' }, { status: 500 });
  }
}

// Note: The above uses a hypothetical PostgreSQL function `save_document_preparation`
// for atomicity. This function needs to be created via a migration.
// It would handle deleting old signers/fields, inserting new ones,
// mapping signer_email to signer_id, and updating the document status.
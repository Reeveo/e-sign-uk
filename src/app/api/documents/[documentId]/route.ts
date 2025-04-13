import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// DELETE - Delete a document by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const documentId = params.documentId;
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    
    // Verify the user has permission to delete this document
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the document to check ownership
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('user_id')
      .eq('id', documentId)
      .single();
    
    if (fetchError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }
    
    // Check if user owns the document
    if (document.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this document' },
        { status: 403 }
      );
    }
    
    // Delete the document
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);
    
    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete document', details: deleteError.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { message: 'Document deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
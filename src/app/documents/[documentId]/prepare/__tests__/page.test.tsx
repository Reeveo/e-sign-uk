// e-sign-uk/src/app/documents/[documentId]/prepare/__tests__/page.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import PrepareDocumentPage from '../page';
import { createClient } from '@/lib/supabase/server'; // We will mock this
import PdfViewer from '@/components/PdfViewer'; // We will mock this
import { notFound } from 'next/navigation'; // We will mock this

// Mock the Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

// Mock the PdfViewer component
jest.mock('@/components/PdfViewer', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jest.fn(({ signedUrl }: { signedUrl: string }) => (
    <div data-testid="mock-pdf-viewer" data-signed-url={signedUrl}>
      Mock PDF Viewer
    </div>
  ));
});


// Mock next/navigation
jest.mock('next/navigation', () => ({
  notFound: jest.fn(),
  // Add redirect mock if needed later, but notFound is used in the component
  redirect: jest.fn(),
}));

// Mock cookies from next/headers (needed by createClient)
// We don't need the actual implementation, just prevent errors
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    // Add other methods if needed by your Supabase client setup
  })),
}));


describe('PrepareDocumentPage', () => {
  const mockDocumentId = 'test-doc-123';
  const mockParams = { params: { documentId: mockDocumentId } };
  let mockSupabaseClient: any; // Use 'any' for simplicity in mocks

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup the mock Supabase client structure for chaining
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(), // Will be configured per test
      storage: {
        from: jest.fn().mockReturnThis(),
        createSignedUrl: jest.fn(), // Will be configured per test
      },
    };
    // Make the mocked createClient return our mock instance
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  it('should call notFound if document fetch fails or document is null', async () => {
    // Arrange: Mock Supabase to return an error on document fetch
    mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: new Error('Fetch error') });

    // Act: Render the component (it's async, so we await its promise)
    // We expect it to throw because notFound() throws an error internally
    await expect(PrepareDocumentPage(mockParams)).rejects.toThrow();


    // Assert: Check if notFound was called
    expect(notFound).toHaveBeenCalledTimes(1);
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('documents');
    expect(mockSupabaseClient.select).toHaveBeenCalledWith('id, name, storage_path, user_id');
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', mockDocumentId);
    expect(mockSupabaseClient.single).toHaveBeenCalledTimes(1);
    // Ensure PdfViewer was not rendered
    expect(screen.queryByTestId('mock-pdf-viewer')).not.toBeInTheDocument();
  });

   it('should call notFound if document data is null (no error)', async () => {
    // Arrange: Mock Supabase to return null data without an error
    mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: null });

    // Act &amp; Assert: Render and expect notFound to be called (which throws)
    await expect(PrepareDocumentPage(mockParams)).rejects.toThrow();
    expect(notFound).toHaveBeenCalledTimes(1);
    expect(mockSupabaseClient.single).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('mock-pdf-viewer')).not.toBeInTheDocument();
  });


  it('should display an error message if signed URL generation fails', async () => {
    // Arrange: Mock successful document fetch but failed signed URL generation
    const mockDocumentData = { id: mockDocumentId, name: 'Test Doc', storage_path: 'path/to/doc.pdf', user_id: 'user-1' };
    mockSupabaseClient.single.mockResolvedValueOnce({ data: mockDocumentData, error: null });
    mockSupabaseClient.storage.createSignedUrl.mockResolvedValueOnce({ data: null, error: new Error('URL generation failed') });

    // Act: Render the component (it's async)
    const PageComponent = await PrepareDocumentPage(mockParams);
    render(PageComponent);


    // Assert: Check for the error message
    expect(notFound).not.toHaveBeenCalled();
    expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('documents');
    expect(mockSupabaseClient.storage.createSignedUrl).toHaveBeenCalledWith('path/to/doc.pdf', 60);
    // Wait for the component to potentially re-render after async operations
    await waitFor(() => {
       expect(screen.getByText('Could not load document preview.')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('mock-pdf-viewer')).not.toBeInTheDocument();
  });

   it('should display an error message if storage_path is missing', async () => {
    // Arrange: Mock successful document fetch but missing storage_path
    const mockDocumentData = { id: mockDocumentId, name: 'Test Doc No Path', storage_path: null, user_id: 'user-1' };
    mockSupabaseClient.single.mockResolvedValueOnce({ data: mockDocumentData, error: null });

    // Act: Render the component
    const PageComponent = await PrepareDocumentPage(mockParams);
    render(PageComponent);

    // Assert: Check for the specific error message
    expect(notFound).not.toHaveBeenCalled();
    expect(mockSupabaseClient.storage.createSignedUrl).not.toHaveBeenCalled(); // Should not attempt to create URL
    await waitFor(() => {
       expect(screen.getByText('Document path not found.')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('mock-pdf-viewer')).not.toBeInTheDocument();
  });


  it('should render PdfViewer with the correct signed URL on successful fetch and URL generation', async () => {
    // Arrange: Mock successful document fetch and signed URL generation
    const mockDocumentData = { id: mockDocumentId, name: 'Successful Doc', storage_path: 'path/to/success.pdf', user_id: 'user-2' };
    const mockSignedUrl = 'https://supabase.example.com/signed/success.pdf?token=123';
    mockSupabaseClient.single.mockResolvedValueOnce({ data: mockDocumentData, error: null });
    mockSupabaseClient.storage.createSignedUrl.mockResolvedValueOnce({ data: { signedUrl: mockSignedUrl }, error: null });

    // Act: Render the component
    const PageComponent = await PrepareDocumentPage(mockParams);
    render(PageComponent);

    // Assert
    expect(notFound).not.toHaveBeenCalled();
    expect(mockSupabaseClient.single).toHaveBeenCalledTimes(1);
    expect(mockSupabaseClient.storage.createSignedUrl).toHaveBeenCalledWith('path/to/success.pdf', 60);

    // Wait for the PdfViewer mock to appear
    await waitFor(() => {
      const pdfViewerMock = screen.getByTestId('mock-pdf-viewer');
      expect(pdfViewerMock).toBeInTheDocument();
      // Check if the mock received the correct prop
      expect(pdfViewerMock).toHaveAttribute('data-signed-url', mockSignedUrl);
    });

    // Check that error messages are not displayed
    expect(screen.queryByText('Could not load document preview.')).not.toBeInTheDocument();
    expect(screen.queryByText('Document path not found.')).not.toBeInTheDocument();
    // Check the title includes the document name
    expect(screen.getByRole('heading', { name: /Prepare Document: Successful Doc/i })).toBeInTheDocument();
  });
});
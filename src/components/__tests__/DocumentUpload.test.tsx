// src/components/__tests__/DocumentUpload.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import DocumentUpload from '../DocumentUpload';
import { createClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('@/lib/supabase/client');
jest.mock('uuid');

// Type assertion for the mocked functions/modules
const mockedCreateClient = createClient as jest.Mock;
const mockedUuidv4 = uuidv4 as jest.Mock;

// Mock Supabase client instance and its methods
const mockSupabase = {
  storage: {
    from: jest.fn().mockReturnThis(), // Allows chaining .from().upload()
    upload: jest.fn(),
  },
  from: jest.fn().mockReturnThis(), // Allows chaining .from().insert()
  insert: jest.fn(),
};

describe('DocumentUpload Component', () => {
  const mockUserId = 'user-123';
  const mockFile = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
  const mockUuid = 'mock-uuid-1234';

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Setup default mock implementations
    mockedCreateClient.mockReturnValue(mockSupabase);
    mockedUuidv4.mockReturnValue(mockUuid);
    // Default success for Supabase calls unless overridden in a specific test
    mockSupabase.storage.upload.mockResolvedValue({ data: { path: `${mockUserId}/${mockUuid}.pdf` }, error: null });
    mockSupabase.from.mockReturnThis(); // Ensure chaining works for insert
    mockSupabase.insert.mockResolvedValue({ data: [{}], error: null });
  });

  it('renders the file input and upload button', () => {
    render(<DocumentUpload userId={mockUserId} />);
    // Find input by its implicit role derived from type="file", though it might be visually hidden
    // A better approach might be to add a data-testid or aria-label
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
   expect(screen.getByRole('button', { name: /upload/i })).toBeDisabled(); // Initially disabled
   // Check for the heading
   expect(screen.getByRole('heading', { name: /upload document/i })).toBeInTheDocument();
   // Check for the input using data-testid
   expect(screen.getByTestId('file-input')).toBeInTheDocument();
 });


  it('enables upload button after file selection', () => {
    render(<DocumentUpload userId={mockUserId} />);
   // Target the input element using data-testid
   const fileInput = screen.getByTestId('file-input');
    const uploadButton = screen.getByRole('button', { name: /upload/i });

    expect(uploadButton).toBeDisabled();
   expect(fileInput).toBeInTheDocument();

   // No need for null check with getByTestId as it throws if not found

    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    expect(uploadButton).not.toBeDisabled();
  });

  it('handles successful file upload', async () => {
    render(<DocumentUpload userId={mockUserId} />);
   const fileInput = screen.getByTestId('file-input');
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    const form = uploadButton.closest('form')!; // Find the parent form

   // No need for null check


    // 1. Select file
    fireEvent.change(fileInput, { target: { files: [mockFile] } });
    expect(uploadButton).not.toBeDisabled();

    // 2. Submit form
    await act(async () => {
      fireEvent.submit(form); // Use submit on the form
    });

    // 3. Assertions
    const expectedStoragePath = `${mockUserId}/${mockUuid}.pdf`;
    expect(mockSupabase.storage.from).toHaveBeenCalledWith('documents');
    expect(mockSupabase.storage.upload).toHaveBeenCalledTimes(1);
    expect(mockSupabase.storage.upload).toHaveBeenCalledWith(expectedStoragePath, mockFile);

    expect(mockSupabase.from).toHaveBeenCalledWith('documents');
    expect(mockSupabase.insert).toHaveBeenCalledTimes(1);
    expect(mockSupabase.insert).toHaveBeenCalledWith({
      filename: mockFile.name,
      user_id: mockUserId,
      storage_path: expectedStoragePath,
      status: 'draft',
    });

   await waitFor(() => {
     expect(screen.getByText('File uploaded successfully!')).toBeInTheDocument();
     // Check final state after successful upload and reset within waitFor
     expect((fileInput as HTMLInputElement).value).toBe(''); // Check value is cleared after reset
     expect(uploadButton).toBeDisabled(); // Should be disabled after successful upload & reset
   });
  });

  it('handles storage upload failure', async () => {
    // Arrange: Mock storage upload to fail
    const storageError = { message: 'Failed to upload to storage' }; // Supabase errors often have a message property
    mockSupabase.storage.upload.mockResolvedValue({ data: null, error: storageError });

    render(<DocumentUpload userId={mockUserId} />);
   const fileInput = screen.getByTestId('file-input');
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    const form = uploadButton.closest('form')!;

   // No need for null check


    // 1. Select file
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    // 2. Submit form
    await act(async () => {
      fireEvent.submit(form);
    });

    // 3. Assertions
    expect(mockSupabase.storage.upload).toHaveBeenCalledTimes(1);
    expect(mockSupabase.insert).not.toHaveBeenCalled(); // DB insert should not happen

    await waitFor(() => {
      // Check for the specific error message format from the component
      expect(screen.getByText(`Storage Error: ${storageError.message}`)).toBeInTheDocument();
    });
    expect(screen.queryByText('File uploaded successfully!')).not.toBeInTheDocument();
    expect(uploadButton).not.toBeDisabled(); // Button should remain enabled on error
  });


  it('handles database insert failure', async () => {
    // Arrange: Mock DB insert to fail
    const dbError = { message: 'Failed to insert into database' }; // Supabase errors often have a message property
    mockSupabase.insert.mockResolvedValue({ data: null, error: dbError });

    render(<DocumentUpload userId={mockUserId} />);
   const fileInput = screen.getByTestId('file-input');
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    const form = uploadButton.closest('form')!;

   // No need for null check


    // 1. Select file
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    // 2. Submit form
    await act(async () => {
      fireEvent.submit(form);
    });

    // 3. Assertions
    expect(mockSupabase.storage.upload).toHaveBeenCalledTimes(1); // Storage upload should still be called
    expect(mockSupabase.insert).toHaveBeenCalledTimes(1); // DB insert IS called

    await waitFor(() => {
       // Check for the specific error message format from the component
      expect(screen.getByText(`Database Error: ${dbError.message}`)).toBeInTheDocument();
    });
    expect(screen.queryByText('File uploaded successfully!')).not.toBeInTheDocument();
    expect(uploadButton).not.toBeDisabled(); // Button should remain enabled on error
  });

   it('shows error if no file is selected on submit', async () => {
    render(<DocumentUpload userId={mockUserId} />);
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    const form = uploadButton.closest('form')!;

    // Submit without selecting a file
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(mockSupabase.storage.upload).not.toHaveBeenCalled();
    expect(mockSupabase.insert).not.toHaveBeenCalled();
    expect(screen.getByText('Please select a PDF file to upload.')).toBeInTheDocument();
  });

   it('shows error if userId is missing', async () => {
    render(<DocumentUpload userId="" />); // Pass empty userId
   const fileInput = screen.getByTestId('file-input');
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    const form = uploadButton.closest('form')!;

   // No need for null check


    // Select file
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    // Submit
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(mockSupabase.storage.upload).not.toHaveBeenCalled();
    expect(mockSupabase.insert).not.toHaveBeenCalled();
    expect(screen.getByText('User not identified. Cannot upload.')).toBeInTheDocument();
  });

});

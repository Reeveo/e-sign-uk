// src/components/__tests__/DocumentList.test.tsx
import React from 'react';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'; // Import within
import '@testing-library/jest-dom';
import { format } from 'date-fns';
import DocumentList from '../DocumentList';

// Mock next/link
jest.mock('next/link', () => {
  // eslint-disable-next-line react/display-name
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Mock window.confirm
const mockConfirm = jest.fn(() => true);
window.confirm = mockConfirm;

// Mock fetch
global.fetch = jest.fn();

// Define the Document type matching the component's expectation
interface Document {
  id: string;
  filename: string | null;
  status: string | null;
  created_at: string; // ISO string format expected by new Date()
}

describe('DocumentList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup fetch mock to return successful response by default
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Document deleted successfully' }),
    });
  });

  it('renders "no documents" message when documents array is null', () => {
    render(<DocumentList documents={null} />);
    expect(screen.getByText(/You haven't uploaded any documents yet./i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders "no documents" message when documents array is empty', () => {
    render(<DocumentList documents={[]} />);
    expect(screen.getByText(/You haven't uploaded any documents yet./i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders the table with document details when documents are provided', () => {
    const mockDocuments: Document[] = [
      {
        id: 'doc-1',
        filename: 'contract.pdf',
        status: 'draft',
        created_at: '2023-10-26T10:00:00.000Z',
      },
      {
        id: 'doc-2',
        filename: 'invoice.pdf',
        status: 'Completed',
        created_at: '2023-10-27T11:30:00.000Z',
      },
      {
        id: 'doc-3',
        filename: null, // Test null filename
        status: 'Pending',
        created_at: '2023-10-28T12:00:00.000Z',
      },
    ];

    render(<DocumentList documents={mockDocuments} />);

    // Check table headers
    expect(screen.getByRole('columnheader', { name: /filename/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /uploaded on/i })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.queryByText(/You haven't uploaded any documents yet./i)).not.toBeInTheDocument();

    // Check rows using within
    const tableBody = screen.getByRole('table').querySelector('tbody');
    expect(tableBody).toBeInTheDocument();

    if (!tableBody) throw new Error("Table body not found");
    
    // Check if delete buttons are present
    const deleteButtons = screen.getAllByRole('button', { name: /delete document/i });
    expect(deleteButtons.length).toBe(mockDocuments.length);
  });
  
  it('deletes a document when delete button is clicked and confirmed', async () => {
    const mockDocuments: Document[] = [
      {
        id: 'doc-1',
        filename: 'contract.pdf',
        status: 'draft',
        created_at: '2023-10-26T10:00:00.000Z',
      },
      {
        id: 'doc-2',
        filename: 'invoice.pdf',
        status: 'completed',
        created_at: '2023-10-27T11:30:00.000Z',
      },
    ];

    render(<DocumentList documents={mockDocuments} />);
    
    // Find and click the delete button for the first document
    const deleteButtons = screen.getAllByRole('button', { name: /delete document/i });
    fireEvent.click(deleteButtons[0]);
    
    // Confirm should have been called
    expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete this document?');
    
    // Fetch should have been called with correct URL and method
    expect(global.fetch).toHaveBeenCalledWith(`/api/documents/doc-1`, { method: 'DELETE' });
    
    // Wait for the document to be removed from the UI
    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      // Header row + 1 document row (instead of 2)
      expect(rows.length).toBe(2);
    });
  });
  
  it('does not delete a document when confirmation is canceled', async () => {
    const mockDocuments: Document[] = [
      {
        id: 'doc-1',
        filename: 'contract.pdf',
        status: 'draft',
        created_at: '2023-10-26T10:00:00.000Z',
      },
    ];

    // Set confirm to return false for this test
    mockConfirm.mockReturnValueOnce(false);
    
    render(<DocumentList documents={mockDocuments} />);
    
    // Find and click the delete button
    const deleteButton = screen.getByRole('button', { name: /delete document/i });
    fireEvent.click(deleteButton);
    
    // Confirm should have been called
    expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete this document?');
    
    // Fetch should NOT have been called
    expect(global.fetch).not.toHaveBeenCalled();
    
    // Document should still be in the UI
    const rows = screen.getAllByRole('row');
    // Header row + 1 document row
    expect(rows.length).toBe(2);
  });
  
  it('displays an error message when document deletion fails', async () => {
    const mockDocuments: Document[] = [
      {
        id: 'doc-1',
        filename: 'contract.pdf',
        status: 'draft',
        created_at: '2023-10-26T10:00:00.000Z',
      },
    ];
    
    // Set fetch to return error for this test
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Permission denied' }),
    });
    
    render(<DocumentList documents={mockDocuments} />);
    
    // Find and click the delete button
    const deleteButton = screen.getByRole('button', { name: /delete document/i });
    fireEvent.click(deleteButton);
    
    // Wait for the error message to appear
    await waitFor(() => {
      expect(screen.getByText('Permission denied')).toBeInTheDocument();
    });
    
    // Document should still be in the UI
    const rows = screen.getAllByRole('row');
    // Header row + 1 document row
    expect(rows.length).toBe(2);
  });
});
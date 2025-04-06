// src/components/__tests__/DocumentList.test.tsx
import React from 'react';
import { render, screen, within } from '@testing-library/react'; // Import within
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

// Define the Document type matching the component's expectation
interface Document {
  id: string;
  filename: string | null;
  status: string | null;
  created_at: string; // ISO string format expected by new Date()
}

describe('DocumentList Component', () => {
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

    const rows = within(tableBody).getAllByRole('row');
    expect(rows).toHaveLength(mockDocuments.length);

    // Check content of each row
    mockDocuments.forEach((doc, index) => {
      const row = rows[index];
      expect(within(row).getByText(doc.filename ?? 'N/A')).toBeInTheDocument();
      expect(within(row).getByText(doc.status ?? 'Draft')).toBeInTheDocument();
      expect(within(row).getByText(format(new Date(doc.created_at), 'PPpp'))).toBeInTheDocument();

      const prepareLink = within(row).getByRole('link', { name: /prepare/i });
      expect(prepareLink).toBeInTheDocument();
      expect(prepareLink).toHaveAttribute('href', `/documents/${doc.id}/prepare`);

      const viewLink = within(row).getByRole('link', { name: /view/i });
      expect(viewLink).toBeInTheDocument();
      expect(viewLink).toHaveAttribute('href', `/documents/${doc.id}/view`);
    });

     // Specific check for N/A filename in the third row
     expect(within(rows[2]).getByText('N/A')).toBeInTheDocument();
     // Specific check for status styling class (example for Completed)
     const completedStatusSpan = within(rows[1]).getByText('Completed');
     expect(completedStatusSpan).toHaveClass('bg-green-100', 'text-green-800'); // Example class check
     // Specific check for status styling class (example for Pending)
     const pendingStatusSpan = within(rows[2]).getByText('Pending');
     expect(pendingStatusSpan).toHaveClass('bg-yellow-100', 'text-yellow-800'); // Example class check
     // Specific check for status styling class (example for draft/default)
     const draftStatusSpan = within(rows[0]).getByText('draft');
     expect(draftStatusSpan).toHaveClass('bg-gray-100', 'text-gray-800'); // Example class check

  });
});
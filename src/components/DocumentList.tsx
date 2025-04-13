"use client";

import Link from 'next/link';
import { format } from 'date-fns'; // Using date-fns for date formatting
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Define the shape of a document object based on the fetched data
interface Document {
  id: string;
  filename: string | null;
  status: string | null; // Assuming status is a string, adjust if needed
  created_at: string; // Supabase returns timestamp as string
}

interface DocumentListProps {
  documents: Document[] | null; // Allow null in case of fetch error or no documents
}

export default function DocumentList({ documents: initialDocuments }: DocumentListProps) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  if (!documents || documents.length === 0) {
    return (
      <p className="text-center text-esign-secondary-text py-4">
        You haven't uploaded any documents yet.
      </p>
    );
  }
  
  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }
    
    try {
      setIsDeleting(documentId);
      setError(null);
      
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete document');
      }
      
      // Update the local state to remove the deleted document
      setDocuments(prevDocuments => 
        prevDocuments ? prevDocuments.filter(doc => doc.id !== documentId) : null
      );
    } catch (err) {
      console.error('Error deleting document:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="overflow-x-auto">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <table className="min-w-full divide-y divide-esign-border">
        <thead className="bg-esign-background">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-esign-secondary-text uppercase tracking-wider"
            >
              Filename
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-esign-secondary-text uppercase tracking-wider"
            >
              Status
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-esign-secondary-text uppercase tracking-wider"
            >
              Uploaded On
            </th>
            {/* Make Actions header visible */}
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-esign-secondary-text uppercase tracking-wider"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-esign-card divide-y divide-esign-border">
          {documents.map((doc) => (
            <tr key={doc.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-esign-primary-text">
                {doc.filename || 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {doc.status === 'completed' && (
                  <span className="esign-status-signed">Completed</span>
                )}
                {doc.status === 'waiting' && (
                  <span className="esign-status-waiting">Waiting</span>
                )}
                {(!doc.status || doc.status === 'draft') && (
                  <span className="esign-status-draft">Draft</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-esign-secondary-text">
                {format(new Date(doc.created_at), 'dd MMM yyyy')} {/* Format date as DD MMM YYYY */}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex space-x-2">
                <Link
                  href={`/documents/${doc.id}/prepare`}
                  className="esign-button-primary text-xs py-1 px-3"
                >
                  Prepare
                </Link>
                <button
                  onClick={() => handleDelete(doc.id)}
                  disabled={isDeleting === doc.id}
                  className="esign-button-danger text-xs py-1 px-3 disabled:opacity-50"
                  aria-label="Delete document"
                >
                  {isDeleting === doc.id ? 'Deleting...' : 'Delete'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
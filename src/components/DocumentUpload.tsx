'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter
import { createClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

interface DocumentUploadProps {
  userId: string;
}

export default function DocumentUpload({ userId }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null); // Restore message state
  const [error, setError] = useState<string | null>(null);
  const [uploadedDocumentId, setUploadedDocumentId] = useState<string | null>(null); // State for the new doc ID
  const router = useRouter(); // Initialize router

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(null);
    setError(null);
    setUploadedDocumentId(null); // Reset doc ID when file changes
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    } else {
      setFile(null);
    }
  };

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setUploadedDocumentId(null); // Reset doc ID on new upload attempt

    if (!file) {
      setError('Please select a PDF file to upload.');
      return;
    }

    if (!userId) {
        setError('User not identified. Cannot upload.');
        return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      // 1. Upload to Storage
      const fileExt = file.name.split('.').pop();
      const uniqueFileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${userId}/${uniqueFileName}`;

      // console.log('Attempting storage upload...');
      const { data: storageData, error: storageError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);
      // console.log('Storage upload finished. Error:', storageError);

      if (storageError) {
        throw new Error(`Storage Error: ${storageError.message}`);
      }

      if (!storageData) {
        throw new Error('Storage upload failed, no path returned.');
      }

      // 2. Insert into Database and get the ID back
      // console.log('Attempting database insert...');
      // Removed explicit session check
      const { data: dbData, error: dbError } = await supabase
        .from('documents')
        .insert({
          filename: file.name,
          user_id: userId,
          storage_path: storageData.path,
          status: 'draft',
        })
        .select('id')
        .single();
      // console.log('Database insert finished. Error:', dbError, 'Data:', dbData);

      if (dbError) {
        throw new Error(`Database Error: ${dbError.message}`);
      }

      if (!dbData || !dbData.id) {
          console.error('Database insert succeeded but did not return an ID. Result:', dbData);
          throw new Error('Upload successful, but failed to retrieve document details. Please refresh or check the document list.');
      }

      setMessage('File uploaded successfully!'); // Set success message
      // console.log('Setting uploadedDocumentId to:', dbData.id);
      setUploadedDocumentId(dbData.id); // Store the returned document ID
      setFile(null); // Clear file state

      // Reset the file input visually
      if (event.target instanceof HTMLFormElement) {
        event.target.reset();
      }

    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.message || 'An unexpected error occurred during upload. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  // Restore handlePrepareClick
  const handlePrepareClick = () => {
    if (uploadedDocumentId) {
      router.push(`/documents/${uploadedDocumentId}/prepare`);
    }
  };

  return (
    <div>
      <h2 className="text-base font-medium text-esign-primary-text mb-3">Upload Document (PDF only)</h2>
      <form onSubmit={handleUpload} className="space-y-4">
        <div>
          <label htmlFor="file-upload" className="sr-only">Choose file</label>
          <input
            id="file-upload"
            name="file-upload"
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            disabled={loading}
            data-testid="file-input"
            className="block w-full text-sm text-esign-secondary-text file:mr-4 file:py-2 file:px-4 
            file:rounded-md file:border-0 file:text-sm file:font-semibold 
            file:bg-esign-button-primary file:text-white 
            hover:file:bg-esign-button-primary-hover disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !file}
          className="esign-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
      {/* Restore conditional rendering block */}
      {uploadedDocumentId ? (
        <div className="mt-4 space-y-2">
            {/* Use message state for success message */}
            <p className="text-sm text-esign-signed">{message}</p>
            <button
                type="button"
                onClick={handlePrepareClick}
                className="esign-button-primary"
            >
                Prepare Document
            </button>
        </div>
      ) : (
        <>
            {/* Show message only if it's set and there's no error */}
            {message && !error && <p className="mt-4 text-sm text-esign-signed">{message}</p>}
            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </>
      )}
    </div>
  );
}
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client'; // Assuming this path is correct
import { v4 as uuidv4 } from 'uuid'; // For generating unique filenames

// Define props if needed, e.g., userId if passed from parent
interface DocumentUploadProps {
  userId: string;
}

export default function DocumentUpload({ userId }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(null);
    setError(null);
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
      const filePath = `${userId}/${uniqueFileName}`; // e.g., user_id/random-uuid.pdf

      const { data: storageData, error: storageError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (storageError) {
        throw new Error(`Storage Error: ${storageError.message}`);
      }

      if (!storageData) {
        throw new Error('Storage upload failed, no path returned.');
      }

      // 2. Insert into Database
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          filename: file.name, // Original filename
          user_id: userId,
          storage_path: storageData.path, // Path from storage response
          status: 'draft', // Default status
        });

      if (dbError) {
        // Consider deleting the uploaded file from storage if DB insert fails
        // await supabase.storage.from('documents').remove([filePath]);
        throw new Error(`Database Error: ${dbError.message}`);
      }

      setMessage('File uploaded successfully!');
      setFile(null); // Clear file input (though the input element itself needs resetting)
      // Reset the file input visually
      if (event.target instanceof HTMLFormElement) {
        event.target.reset();
      }

    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.message || 'An unexpected error occurred during upload.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Upload Document (PDF only)</h2>
      <form onSubmit={handleUpload}>
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          disabled={loading}
          data-testid="file-input" // Add data-testid
        />
        <button type="submit" disabled={loading || !file}>
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
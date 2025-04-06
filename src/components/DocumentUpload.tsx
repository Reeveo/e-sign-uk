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
      {/* Title adjusted for consistency */}
      <h2 className="text-base font-medium text-gray-900 mb-3">Upload Document (PDF only)</h2>
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
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-secondary file:text-white hover:file:bg-brand-secondary/90 disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !file}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-brand-white bg-brand-primary hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
      {message && <p className="text-sm text-brand-green">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
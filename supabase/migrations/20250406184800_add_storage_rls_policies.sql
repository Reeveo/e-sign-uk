-- Grant authenticated users permission to upload into their own folder in the 'documents' bucket.
-- The path is expected to be like 'user_id/filename.pdf'

CREATE POLICY "Allow authenticated uploads to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1] -- Check if the first folder name matches the user's ID
);

-- Optional: Grant authenticated users permission to view/download their own documents
CREATE POLICY "Allow authenticated select for own folder"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Optional: Grant authenticated users permission to delete their own documents
CREATE POLICY "Allow authenticated delete for own folder"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Optional: Grant authenticated users permission to update their own documents (if needed)
-- CREATE POLICY "Allow authenticated update for own folder"
-- ON storage.objects FOR UPDATE TO authenticated
-- USING (
--   bucket_id = 'documents' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );
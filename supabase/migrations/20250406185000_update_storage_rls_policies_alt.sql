-- Drop existing storage policies first to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated uploads to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated select for own folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete for own folder" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow authenticated update for own folder" ON storage.objects; -- Uncomment if update policy was added

-- Grant authenticated users permission to upload into their own folder in the 'documents' bucket.
-- Alternative check: Ensure the object name starts with the user's ID followed by a slash.
CREATE POLICY "Allow authenticated uploads to own folder (alt)"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  name LIKE (auth.uid()::text || '/%') -- Check if name starts with 'user_id/'
);

-- Optional: Grant authenticated users permission to view/download their own documents (alt)
CREATE POLICY "Allow authenticated select for own folder (alt)"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents' AND
  name LIKE (auth.uid()::text || '/%')
);

-- Optional: Grant authenticated users permission to delete their own documents (alt)
CREATE POLICY "Allow authenticated delete for own folder (alt)"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents' AND
  name LIKE (auth.uid()::text || '/%')
);

-- Optional: Grant authenticated users permission to update their own documents (alt)
-- CREATE POLICY "Allow authenticated update for own folder (alt)"
-- ON storage.objects FOR UPDATE TO authenticated
-- USING (
--   bucket_id = 'documents' AND
--   name LIKE (auth.uid()::text || '/%')
-- );
-- Drop debugging storage policies
DROP POLICY IF EXISTS "DEBUG Allow any authenticated insert" ON storage.objects;
DROP POLICY IF EXISTS "DEBUG Allow any authenticated select" ON storage.objects;
DROP POLICY IF EXISTS "DEBUG Allow any authenticated delete" ON storage.objects;

-- Re-apply the alternative secure policies from 20250406185000

-- Grant authenticated users permission to upload into their own folder in the 'documents' bucket.
CREATE POLICY "Allow authenticated uploads to own folder (alt)"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  name LIKE (auth.uid()::text || '/%') -- Check if name starts with 'user_id/'
);

-- Grant authenticated users permission to view/download their own documents (alt)
CREATE POLICY "Allow authenticated select for own folder (alt)"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents' AND
  name LIKE (auth.uid()::text || '/%')
);

-- Grant authenticated users permission to delete their own documents (alt)
CREATE POLICY "Allow authenticated delete for own folder (alt)"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents' AND
  name LIKE (auth.uid()::text || '/%')
);
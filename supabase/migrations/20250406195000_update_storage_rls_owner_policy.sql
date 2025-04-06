-- Drop existing storage policies first to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated uploads to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated select for own folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete for own folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to own folder (alt)" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated select for own folder (alt)" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete for own folder (alt)" ON storage.objects;
DROP POLICY IF EXISTS "DEBUG Allow any authenticated insert" ON storage.objects;
DROP POLICY IF EXISTS "DEBUG Allow any authenticated select" ON storage.objects;
DROP POLICY IF EXISTS "DEBUG Allow any authenticated delete" ON storage.objects;

-- Grant authenticated users permission based on object owner matching their UID

CREATE POLICY "Allow uploads for owner"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  auth.uid() = owner -- Check if owner matches the user's ID
);

CREATE POLICY "Allow select for owner"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents' AND
  auth.uid() = owner
);

CREATE POLICY "Allow delete for owner"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents' AND
  auth.uid() = owner
);

-- Note: Update policy might also be needed depending on requirements
-- CREATE POLICY "Allow update for owner"
-- ON storage.objects FOR UPDATE TO authenticated
-- USING (
--   bucket_id = 'documents' AND
--   auth.uid() = owner
-- );
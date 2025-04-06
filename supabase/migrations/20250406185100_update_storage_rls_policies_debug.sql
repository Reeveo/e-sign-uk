-- Drop existing storage policies first to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated uploads to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated select for own folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete for own folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to own folder (alt)" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated select for own folder (alt)" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete for own folder (alt)" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow authenticated update for own folder" ON storage.objects; -- Uncomment if update policy was added
-- DROP POLICY IF EXISTS "Allow authenticated update for own folder (alt)" ON storage.objects; -- Uncomment if update policy was added


-- DEBUGGING POLICY: Allow ANY authenticated user to insert into the documents bucket.
-- THIS IS INSECURE - FOR DIAGNOSTICS ONLY
CREATE POLICY "DEBUG Allow any authenticated insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
);

-- DEBUGGING POLICY: Allow ANY authenticated user to select from the documents bucket.
CREATE POLICY "DEBUG Allow any authenticated select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
);

-- DEBUGGING POLICY: Allow ANY authenticated user to delete from the documents bucket.
CREATE POLICY "DEBUG Allow any authenticated delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
);
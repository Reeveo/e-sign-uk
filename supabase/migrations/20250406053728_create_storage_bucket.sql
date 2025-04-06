-- Create the 'documents' storage bucket
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false);

-- Note: Access control policies can be added here or later.
-- For now, we are just creating the private bucket.
-- Uploads will likely use the service_role key or require specific RLS policies/signed URLs.
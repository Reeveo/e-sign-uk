-- Add columns to store signing token details for each signer

-- Add signing_token column
alter table public.document_signers
add column signing_token text null;

-- Add constraint for uniqueness
alter table public.document_signers
add constraint document_signers_signing_token_key unique (signing_token);

-- Add token_status column with default value
alter table public.document_signers
add column token_status text not null default 'pending';

-- Add token_expires_at column
alter table public.document_signers
add column token_expires_at timestamptz null;

-- Optional: Add an index for faster lookups based on token
create index if not exists idx_document_signers_signing_token
on public.document_signers (signing_token);

-- Optional: Add an index for faster lookups for pending/expired tokens
create index if not exists idx_document_signers_token_status
on public.document_signers (token_status);
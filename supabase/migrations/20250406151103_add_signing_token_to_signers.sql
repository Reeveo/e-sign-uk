-- Add columns to store signing token details for each signer

-- Add signing_token column
alter table public.signers
add column signing_token text null;

-- Add constraint for uniqueness
alter table public.signers
add constraint signers_signing_token_key unique (signing_token); -- Renamed constraint for clarity

-- Add token_status column with default value
alter table public.signers
add column token_status text not null default 'pending';

-- Add token_expires_at column
alter table public.signers
add column token_expires_at timestamptz null;

-- Optional: Add an index for faster lookups based on token
create index if not exists idx_signers_signing_token
on public.signers (signing_token); -- Renamed index for clarity

-- Optional: Add an index for faster lookups for pending/expired tokens
create index if not exists idx_signers_token_status
on public.signers (token_status); -- Renamed index for clarity
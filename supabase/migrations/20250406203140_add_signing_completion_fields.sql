-- Add column to store the actual submitted value for a field
ALTER TABLE public.document_fields
ADD COLUMN value TEXT NULL;

-- Add columns to track when a signer completed their action and from where
ALTER TABLE public.document_signers
ADD COLUMN signed_at TIMESTAMPTZ NULL,
ADD COLUMN ip_address INET NULL;

-- Optional: Add comments for clarity
COMMENT ON COLUMN public.document_fields.value IS 'Stores the actual data submitted by the signer for this field (text, date string, signature data URL/typed text).';
COMMENT ON COLUMN public.document_signers.signed_at IS 'Timestamp when the signer completed their signing action.';
COMMENT ON COLUMN public.document_signers.ip_address IS 'IP address from which the signer completed their action.';
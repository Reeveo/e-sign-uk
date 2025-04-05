-- Create the documents table
CREATE TABLE documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    storage_path text NOT NULL,
    filename text NOT NULL,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'completed')),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add index on user_id and status for documents
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(status);

-- Create the signers table
CREATE TABLE signers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    email text NOT NULL,
    name text,
    signing_order integer NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'declined')),
    signature_data jsonb,
    signed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (document_id, signing_order) -- Ensure unique signing order per document
);

-- Add index on document_id and status for signers
CREATE INDEX idx_signers_document_id ON signers(document_id);
CREATE INDEX idx_signers_status ON signers(status);

-- Create the recipients table (for CC'd users who don't sign)
CREATE TABLE recipients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (document_id, email) -- Ensure unique recipient email per document
);

-- Add index on document_id for recipients
CREATE INDEX idx_recipients_document_id ON recipients(document_id);

-- Create the signature_fields table
CREATE TABLE signature_fields (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    signer_id uuid REFERENCES signers(id) ON DELETE CASCADE, -- Can be null if it's a field for the sender or a general text field
    type text NOT NULL CHECK (type IN ('signature', 'initials', 'text', 'date', 'checkbox')),
    page_number integer NOT NULL,
    position_x real NOT NULL, -- Using real for potential fractional coordinates
    position_y real NOT NULL,
    width real,
    height real,
    required boolean DEFAULT true NOT NULL,
    value text, -- For pre-filled or signer-filled text fields
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add index on document_id and signer_id for signature_fields
CREATE INDEX idx_signature_fields_document_id ON signature_fields(document_id);
CREATE INDEX idx_signature_fields_signer_id ON signature_fields(signer_id);

-- Create the audit_trail table
CREATE TABLE audit_trail (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- User performing the action (can be null for system events or anonymous views)
    signer_id uuid REFERENCES signers(id) ON DELETE SET NULL, -- Signer involved (if applicable)
    event_type text NOT NULL CHECK (event_type IN ('created', 'sent', 'viewed', 'signed', 'declined', 'completed', 'field_placed', 'field_updated', 'recipient_added')),
    ip_address inet,
    user_agent text,
    details jsonb, -- Optional extra details about the event
    event_timestamp timestamp with time zone DEFAULT now() NOT NULL
);

-- Add index on document_id, user_id, signer_id, and event_type for audit_trail
CREATE INDEX idx_audit_trail_document_id ON audit_trail(document_id);
CREATE INDEX idx_audit_trail_user_id ON audit_trail(user_id);
CREATE INDEX idx_audit_trail_signer_id ON audit_trail(signer_id);
CREATE INDEX idx_audit_trail_event_type ON audit_trail(event_type);

-- Optional: Function to update 'updated_at' columns automatically
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to tables with 'updated_at'
CREATE TRIGGER set_timestamp_documents
BEFORE UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_signers
BEFORE UPDATE ON signers
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_signature_fields
BEFORE UPDATE ON signature_fields
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
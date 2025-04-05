-- Enable RLS for all relevant tables
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signature_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;

-- Policies for documents table
CREATE POLICY "Allow individual select access" ON public.documents
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Allow individual insert access" ON public.documents
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow individual update access" ON public.documents
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Allow individual delete access" ON public.documents
FOR DELETE
USING (auth.uid() = user_id);

-- Policies for related tables (signers, recipients, signature_fields, audit_trail)

-- Signers
CREATE POLICY "Allow owners full access to related signers" ON public.signers
FOR ALL
USING (
  auth.uid() = (SELECT user_id FROM public.documents WHERE id = signers.document_id)
)
WITH CHECK (
  auth.uid() = (SELECT user_id FROM public.documents WHERE id = signers.document_id)
);

-- Recipients
CREATE POLICY "Allow owners full access to related recipients" ON public.recipients
FOR ALL
USING (
  auth.uid() = (SELECT user_id FROM public.documents WHERE id = recipients.document_id)
)
WITH CHECK (
  auth.uid() = (SELECT user_id FROM public.documents WHERE id = recipients.document_id)
);

-- Signature Fields
CREATE POLICY "Allow owners full access to related signature fields" ON public.signature_fields
FOR ALL
USING (
  auth.uid() = (SELECT user_id FROM public.documents WHERE id = signature_fields.document_id)
)
WITH CHECK (
  auth.uid() = (SELECT user_id FROM public.documents WHERE id = signature_fields.document_id)
);

-- Audit Trail
CREATE POLICY "Allow owners full access to related audit trail" ON public.audit_trail
FOR ALL
USING (
  auth.uid() = (SELECT user_id FROM public.documents WHERE id = audit_trail.document_id)
)
WITH CHECK (
  auth.uid() = (SELECT user_id FROM public.documents WHERE id = audit_trail.document_id)
);
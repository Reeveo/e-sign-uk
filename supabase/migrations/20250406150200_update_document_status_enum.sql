-- Remove the old constraint
ALTER TABLE documents
DROP CONSTRAINT documents_status_check;

-- Add the new constraint with updated values
ALTER TABLE documents
ADD CONSTRAINT documents_status_check CHECK (status IN ('draft', 'preparing', 'ready_to_send', 'sent', 'completed'));

-- Optional: Update existing 'draft' documents to 'preparing' if needed,
-- but likely better handled by application logic upon first preparation save.
-- Example: UPDATE documents SET status = 'preparing' WHERE status = 'draft';
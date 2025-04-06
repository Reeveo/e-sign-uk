-- Function to atomically save document preparation state (signers and fields)
CREATE OR REPLACE FUNCTION save_document_preparation(
    p_document_id uuid,
    p_user_id uuid, -- For authorization check within the function
    p_signers jsonb, -- Array of objects: {email: text, signing_order: int, name?: text}
    p_fields jsonb,  -- Array of objects: {type: text, pageNumber: int, xCoordinate: real, yCoordinate: real, signerEmail: text|null, width?: real, height?: real, required?: boolean, value?: text}
    p_new_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER -- Run as the calling user, relies on RLS policies being correctly set up
AS $$
DECLARE
    field_record jsonb; -- Use jsonb for iterating through the field array elements
    v_signer_id uuid;
    v_doc_user_id uuid;
BEGIN
    -- 1. Authorization Check: Ensure the calling user owns the document
    SELECT user_id INTO v_doc_user_id FROM documents WHERE id = p_document_id;

    IF v_doc_user_id IS NULL THEN
        RAISE EXCEPTION 'Document not found for id %', p_document_id;
    END IF;

    IF v_doc_user_id != p_user_id THEN
        RAISE EXCEPTION 'Authorization failed: User % does not own document %', p_user_id, p_document_id;
    END IF;

    -- 2. Clear existing preparation data for this document
    -- Delete fields first due to potential FK constraints from fields to signers
    DELETE FROM signature_fields WHERE document_id = p_document_id;
    DELETE FROM signers WHERE document_id = p_document_id;

    -- 3. Insert new signers
    -- Assumes the input p_signers array has already been validated for unique emails/orders by the API layer
    INSERT INTO signers (document_id, email, signing_order, name, status)
    SELECT
        p_document_id,
        (signer_data->>'email')::text,
        (signer_data->>'signing_order')::integer,
        signer_data->>'name', -- Include name if provided in the JSON object
        'pending' -- Default status for a newly added signer
    FROM jsonb_array_elements(p_signers) AS signer_data;
    -- Consider adding ON CONFLICT clauses if duplicate emails/orders need specific handling,
    -- though the API should prevent duplicates in the input array.

    -- 4. Insert new fields
    FOR field_record IN SELECT * FROM jsonb_array_elements(p_fields)
    LOOP
        -- Reset v_signer_id for each field iteration
        v_signer_id := NULL;

        -- If a signer email is associated with this field, find the corresponding signer_id
        -- We just inserted the signers for this document, so we query based on email and document_id
        IF field_record->>'signerEmail' IS NOT NULL AND field_record->>'signerEmail' != '' THEN
            SELECT id INTO v_signer_id
            FROM signers
            WHERE document_id = p_document_id AND email = field_record->>'signerEmail'
            LIMIT 1; -- Email should be unique per document if constraints are set

            -- Optional: Raise an error if a signer email is provided but not found?
            -- IF v_signer_id IS NULL THEN
            --     RAISE WARNING 'Signer email % provided for a field but not found for document %', field_record->>'signerEmail', p_document_id;
            -- END IF;
        END IF;

        -- Insert the field, linking to the found signer_id (which will be NULL if no email was provided or found)
        INSERT INTO signature_fields (
            document_id,
            signer_id,
            type,
            page_number,
            position_x,
            position_y,
            required,
            width,
            height,
            value
        ) VALUES (
            p_document_id,
            v_signer_id, -- Use the variable holding the looked-up ID (or NULL)
            field_record->>'type',
            (field_record->>'pageNumber')::integer, -- Match API key 'pageNumber'
            (field_record->>'xCoordinate')::real, -- Match API key 'xCoordinate'
            (field_record->>'yCoordinate')::real, -- Match API key 'yCoordinate'
            COALESCE((field_record->>'required')::boolean, true), -- Default 'required' to true if not specified
            (field_record->>'width')::real,
            (field_record->>'height')::real,
            field_record->>'value'
        );
    END LOOP;

    -- 5. Update document status
    UPDATE documents
    SET status = p_new_status,
        updated_at = now() -- Manually set updated_at; function execution might bypass triggers depending on setup
    WHERE id = p_document_id;
    -- No need for user_id check here again as it was done at the start

END;
$$;
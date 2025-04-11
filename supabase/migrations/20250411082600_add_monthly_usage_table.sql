-- Create the monthly_usage table to track document sending limits
CREATE TABLE public.monthly_usage (
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    year_month TEXT NOT NULL, -- Format 'YYYY-MM'
    documents_sent_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,

    PRIMARY KEY (user_id, year_month)
);

-- Comment explaining the table's purpose
COMMENT ON TABLE public.monthly_usage IS 'Tracks the number of documents sent by each user per month for enforcing free tier limits.';
COMMENT ON COLUMN public.monthly_usage.user_id IS 'Foreign key referencing the user who sent the documents.';
COMMENT ON COLUMN public.monthly_usage.year_month IS 'The year and month (format YYYY-MM) for which the count applies.';
COMMENT ON COLUMN public.monthly_usage.documents_sent_count IS 'The number of documents sent by the user during the specified year_month.';
COMMENT ON COLUMN public.monthly_usage.created_at IS 'Timestamp when the record was first created (typically the first send of the month).';
COMMENT ON COLUMN public.monthly_usage.updated_at IS 'Timestamp when the record was last updated (typically on subsequent sends within the month).';


-- Add RLS policy to the new table
ALTER TABLE public.monthly_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to view and manage their own usage records
CREATE POLICY "Allow users to manage their own usage"
ON public.monthly_usage
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Optional: Add an index for potential performance improvements
CREATE INDEX idx_monthly_usage_user_id_year_month ON public.monthly_usage(user_id, year_month);

-- Trigger function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = timezone('utc'::text, now());
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to execute the function before updates on monthly_usage
CREATE TRIGGER update_monthly_usage_updated_at
BEFORE UPDATE ON public.monthly_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to increment usage count atomically using INSERT ON CONFLICT
CREATE OR REPLACE FUNCTION public.increment_monthly_usage(p_user_id uuid, p_year_month text)
RETURNS void AS $$
BEGIN
    INSERT INTO public.monthly_usage (user_id, year_month, documents_sent_count)
    VALUES (p_user_id, p_year_month, 1)
    ON CONFLICT (user_id, year_month)
    DO UPDATE SET
        documents_sent_count = monthly_usage.documents_sent_count + 1,
        -- updated_at is handled by the trigger update_monthly_usage_updated_at
        updated_at = timezone('utc'::text, now()); -- Explicitly set here as well for clarity, trigger handles it too
END;
$$ LANGUAGE plpgsql SECURITY INVOKER; -- SECURITY INVOKER is appropriate here as the function is called from the API route with user's privileges.

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_monthly_usage(uuid, text) TO authenticated;
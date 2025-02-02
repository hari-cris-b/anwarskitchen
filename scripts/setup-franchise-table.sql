-- Create franchises table
CREATE TABLE IF NOT EXISTS franchises (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    settings JSONB DEFAULT '{
        "currency": "INR",
        "tax_rate": 0.18,
        "menu_categories": ["All"]
    }'::jsonb NOT NULL
);

-- Add RLS policies
ALTER TABLE franchises ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access to authenticated users" ON franchises
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow insert/update/delete for admin users only
CREATE POLICY "Allow full access to admin users" ON franchises
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

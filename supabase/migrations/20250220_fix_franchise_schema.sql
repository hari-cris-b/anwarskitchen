-- Begin transaction
BEGIN;

-- Drop the unnecessary migration since table already exists
DROP TABLE IF EXISTS franchise_settings_temp;

-- Ensure indexes exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_franchise_settings_franchise_id') THEN
        CREATE INDEX idx_franchise_settings_franchise_id ON franchise_settings(franchise_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_franchise_settings_unique_franchise') THEN
        CREATE UNIQUE INDEX idx_franchise_settings_unique_franchise ON franchise_settings(franchise_id);
    END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE franchise_settings ENABLE ROW LEVEL SECURITY;

-- Recreate policies (will be ignored if they already exist)
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Staff can view own franchise settings" ON franchise_settings;
    DROP POLICY IF EXISTS "Admins can update own franchise settings" ON franchise_settings;
    DROP POLICY IF EXISTS "Super admins can view franchise settings" ON franchise_settings;
    DROP POLICY IF EXISTS "Super admins can manage franchise settings" ON franchise_settings;
    
    -- Create new policies
    CREATE POLICY "Staff can view own franchise settings" ON franchise_settings
        FOR SELECT
        USING (franchise_id = auth.jwt() ->> 'franchise_id'::text);

    CREATE POLICY "Admins can update own franchise settings" ON franchise_settings
        FOR UPDATE
        USING (franchise_id = auth.jwt() ->> 'franchise_id'::text)
        WITH CHECK (franchise_id = auth.jwt() ->> 'franchise_id'::text);

    CREATE POLICY "Super admins can view franchise settings" ON franchise_settings
        FOR SELECT
        USING (is_super_admin_role());

    CREATE POLICY "Super admins can manage franchise settings" ON franchise_settings
        FOR ALL
        USING (is_super_admin_role());
END $$;

-- Update column comments
COMMENT ON TABLE franchise_settings IS 'Stores settings and configuration for each franchise';
COMMENT ON COLUMN franchise_settings.receipt_header IS 'Custom text to display at the top of receipts';
COMMENT ON COLUMN franchise_settings.receipt_footer IS 'Custom text to display at the bottom of receipts';

COMMIT;
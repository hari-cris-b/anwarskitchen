-- Begin transaction
BEGIN;

-- Add email_verified column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'staff' 
        AND column_name = 'email_verified'
    ) THEN
        ALTER TABLE staff 
        ADD COLUMN email_verified boolean NOT NULL DEFAULT false;
    END IF;
END $$;

-- Update RLS policies for staff table to allow checking email_verified status
DROP POLICY IF EXISTS "Allow public access to staff email verification status" ON staff;
CREATE POLICY "Allow public access to staff email verification status" ON staff
    FOR SELECT
    USING (
        -- Allow access to minimal fields needed for email verification
        (auth.role() = 'anon' AND (
            current_setting('request.path', true) LIKE '/rest/v1/staff%' OR
            current_setting('request.path', true) LIKE '/rest/v1/rpc/check_staff_email'
        ))
        OR
        -- Normal staff access rules
        (
            auth.uid() = auth_id OR
            EXISTS (
                SELECT 1
                FROM staff s
                WHERE s.auth_id = auth.uid()
                AND s.franchise_id = staff.franchise_id
                AND s.can_manage_staff = true
            )
        )
    );

-- Add index for email lookup performance
CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);

-- Create trigger to prevent modifying email_verified directly
CREATE OR REPLACE FUNCTION prevent_direct_email_verified_update()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.email_verified IS DISTINCT FROM NEW.email_verified AND 
       NOT EXISTS (
           SELECT 1 FROM staff 
           WHERE auth_id = auth.uid() 
           AND can_manage_staff = true
       ) THEN
        RAISE EXCEPTION 'email_verified can only be modified by staff managers';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_email_verified_protection ON staff;
CREATE TRIGGER ensure_email_verified_protection
    BEFORE UPDATE ON staff
    FOR EACH ROW
    EXECUTE FUNCTION prevent_direct_email_verified_update();

-- Add comment for documentation
COMMENT ON COLUMN staff.email_verified IS 'Indicates if staff email has been verified by an admin';

COMMIT;
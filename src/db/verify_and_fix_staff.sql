-- Check and create staff table if it doesn't exist
DO $$ 
BEGIN
    -- Create required types if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'staff_role') THEN
        CREATE TYPE staff_role AS ENUM ('manager', 'chef', 'waiter', 'cashier');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shift_type') THEN
        CREATE TYPE shift_type AS ENUM ('morning', 'evening', 'night', 'flexible');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_type') THEN
        CREATE TYPE status_type AS ENUM ('active', 'inactive', 'on_leave');
    END IF;

    -- Create staff table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'staff') THEN
        CREATE TABLE staff (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            role staff_role NOT NULL,
            email TEXT,
            phone TEXT,
            shift shift_type NOT NULL DEFAULT 'flexible',
            hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 15.00,
            status status_type NOT NULL DEFAULT 'active',
            pin_code VARCHAR(4),
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );

        -- Add indexes
        CREATE INDEX staff_franchise_id_idx ON staff(franchise_id);
        CREATE INDEX staff_role_idx ON staff(role);
        CREATE INDEX staff_status_idx ON staff(status);
    ELSE
        -- Add missing columns if table exists but columns are missing
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'staff' AND column_name = 'hourly_rate') THEN
                ALTER TABLE staff ADD COLUMN hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 15.00;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'staff' AND column_name = 'pin_code') THEN
                ALTER TABLE staff ADD COLUMN pin_code VARCHAR(4);
            END IF;
        END $$;
    END IF;

    -- Enable RLS
    ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

    -- Create or replace RLS policies
    DROP POLICY IF EXISTS "staff_franchise_access" ON staff;
    CREATE POLICY "staff_franchise_access"
    ON staff
    FOR ALL
    TO authenticated
    USING (
        franchise_id IN (
            SELECT franchise_id 
            FROM profiles 
            WHERE id = auth.uid()
        )
    );
END $$;

-- Verify table structure and report any issues
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'staff'
ORDER BY 
    ordinal_position;

-- Check for any invalid data
SELECT 
    id,
    name,
    role,
    email,
    hourly_rate,
    status
FROM 
    staff 
WHERE 
    hourly_rate IS NULL 
    OR status IS NULL 
    OR role IS NULL
    OR name IS NULL;

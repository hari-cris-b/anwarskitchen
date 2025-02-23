-- Begin transaction
BEGIN;

-- First drop all dependent policies that use staff_type
DROP POLICY IF EXISTS "Staff can view franchise orders" ON orders;
DROP POLICY IF EXISTS "Staff can access order items" ON order_items;
DROP POLICY IF EXISTS "Staff can view menu items" ON menu_items;
DROP POLICY IF EXISTS "Staff can manage orders" ON orders;
DROP POLICY IF EXISTS "Staff can view own franchise" ON franchises;
DROP POLICY IF EXISTS "Staff can view franchise settings" ON franchise_settings;

-- Ensure the staff_role type exists
DO $$ 
BEGIN
    -- Drop the enum type if it exists
    DROP TYPE IF EXISTS staff_role CASCADE;
    
    -- Create the new enum type
    CREATE TYPE staff_role AS ENUM ('admin', 'manager', 'kitchen', 'staff');
END $$;

-- Drop the staff_new table if it exists to avoid conflicts
DROP TABLE IF EXISTS staff_new;

-- Create a temporary staff table with new schema
CREATE TABLE staff_new (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    franchise_id uuid REFERENCES franchises(id) ON DELETE CASCADE,
    auth_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    phone text,
    staff_type staff_role NOT NULL DEFAULT 'staff'::staff_role,
    status text NOT NULL DEFAULT 'active',
    can_manage_staff boolean DEFAULT false,
    can_void_orders boolean DEFAULT false,
    can_modify_menu boolean DEFAULT false,
    pin_code text,
    shift text,
    hourly_rate numeric,
    joining_date timestamp with time zone,
    email_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    permissions jsonb DEFAULT jsonb_build_object(
        'can_access_pos', true,
        'can_access_kitchen', false,
        'can_access_reports', false,
        'can_manage_menu', false,
        'can_manage_staff', false
    ),
    CONSTRAINT staff_new_pkey PRIMARY KEY (id),
    CONSTRAINT staff_new_auth_id_key UNIQUE (auth_id),
    CONSTRAINT staff_new_email_key UNIQUE (email)
);

-- Copy data from old table
INSERT INTO staff_new (
    id, franchise_id, auth_id, full_name, email, phone, 
    staff_type, status, can_manage_staff, can_void_orders, 
    can_modify_menu, pin_code, shift, hourly_rate, joining_date, 
    email_verified, created_at, updated_at, permissions
)
SELECT 
    id, franchise_id, auth_id, full_name, email, phone,
    CASE staff_type
        WHEN 'admin' THEN 'admin'::staff_role
        WHEN 'manager' THEN 'manager'::staff_role
        WHEN 'kitchen' THEN 'kitchen'::staff_role
        ELSE 'staff'::staff_role
    END as staff_type,
    status, can_manage_staff, can_void_orders,
    can_modify_menu, pin_code, shift, 
    CASE 
        WHEN hourly_rate ~ '^\d+\.?\d*$' THEN hourly_rate::numeric 
        ELSE NULL 
    END,
    CASE 
        WHEN joining_date ~ '^\d{4}-\d{2}-\d{2}' THEN joining_date::timestamp with time zone 
        ELSE NULL 
    END,
    email_verified, created_at, updated_at, 
    COALESCE(permissions, jsonb_build_object(
        'can_access_pos', true,
        'can_access_kitchen', false,
        'can_access_reports', false,
        'can_manage_menu', false,
        'can_manage_staff', false
    ))
FROM staff;

-- Drop old table and rename new one
DROP TABLE staff CASCADE;
ALTER TABLE staff_new RENAME TO staff;

-- Recreate indexes
CREATE INDEX idx_staff_franchise ON staff(franchise_id);
CREATE INDEX idx_staff_auth_id ON staff(auth_id);
CREATE INDEX idx_staff_email ON staff(email);

-- Create unique index to prevent staff from being in multiple franchises
CREATE UNIQUE INDEX staff_auth_franchise_unique 
ON staff(auth_id, COALESCE(franchise_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Recreate staff_email_status view
CREATE VIEW staff_email_status AS
SELECT
    s.id,
    s.email,
    s.full_name,
    s.staff_type::text as staff_type,
    s.franchise_id,
    s.email_verified,
    s.status,
    s.auth_id IS NOT NULL as has_auth_id,
    CASE 
        WHEN s.auth_id IS NOT NULL THEN true
        WHEN s.email_verified THEN true
        ELSE false
    END as is_verified
FROM staff s;

-- Grant permissions
GRANT ALL ON staff TO authenticated;
GRANT ALL ON staff_email_status TO authenticated;

COMMENT ON TABLE staff IS 'Staff members with their roles and permissions';
COMMENT ON COLUMN staff.staff_type IS 'Staff role type using staff_role enum';

-- Note: The dependent policies will be recreated in a separate migration
DO $$ 
BEGIN 
    RAISE NOTICE 'Staff table updated successfully. Dependent policies need to be recreated.'; 
END $$;

COMMIT;
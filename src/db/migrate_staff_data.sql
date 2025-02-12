-- Function to migrate existing staff data
CREATE OR REPLACE FUNCTION migrate_staff_data()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    old_record RECORD;
BEGIN
    -- Create temp table with old structure
    CREATE TEMP TABLE old_staff AS 
    SELECT * FROM staff;

    -- Drop and recreate staff table
    DROP TABLE staff CASCADE;
    
    -- Create new staff table
    CREATE TABLE staff (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
        auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE,
        phone TEXT,
        pin_code VARCHAR(4),
        role staff_role NOT NULL,
        status status_type NOT NULL DEFAULT 'active',
        shift shift_type,
        hourly_rate DECIMAL(10,2) DEFAULT 15.00,
        joining_date DATE DEFAULT CURRENT_DATE,
        can_void_orders BOOLEAN DEFAULT false,
        can_modify_menu BOOLEAN DEFAULT false,
        can_manage_staff BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT valid_pin CHECK (pin_code ~ '^[0-9]{4}$')
    );

    -- Migrate data
    FOR old_record IN SELECT * FROM old_staff LOOP
        INSERT INTO staff (
            id,
            franchise_id,
            full_name,
            email,
            phone,
            pin_code,
            role,
            status,
            shift,
            hourly_rate,
            joining_date,
            can_void_orders,
            can_modify_menu,
            can_manage_staff,
            created_at,
            updated_at
        ) VALUES (
            old_record.id,
            old_record.franchise_id,
            old_record.name,
            old_record.email,
            old_record.phone,
            old_record.pin_code,
            CASE 
                WHEN old_record.role = 'manager' THEN 'manager'::staff_role
                WHEN old_record.role = 'chef' THEN 'kitchen'::staff_role
                WHEN old_record.role IN ('waiter', 'cashier') THEN 'staff'::staff_role
                ELSE 'staff'::staff_role
            END,
            COALESCE(old_record.status::status_type, 'active'),
            old_record.shift::shift_type,
            COALESCE(old_record.hourly_rate, 15.00),
            COALESCE(old_record.joining_date, CURRENT_DATE),
            false,
            false,
            old_record.role = 'manager',
            COALESCE(old_record.created_at, now()),
            COALESCE(old_record.updated_at, now())
        );
    END LOOP;

    -- Link auth users
    UPDATE staff s
    SET auth_id = u.id
    FROM auth.users u
    WHERE s.email = u.email;

    -- Drop temp table
    DROP TABLE old_staff;
END;
$$;

-- Note: Execute the migration with:
-- SELECT migrate_staff_data();
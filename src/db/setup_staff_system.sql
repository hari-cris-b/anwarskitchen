-- Drop existing objects
DROP TABLE IF EXISTS staff CASCADE;
DROP TYPE IF EXISTS staff_role CASCADE;
DROP TYPE IF EXISTS shift_type CASCADE;
DROP TYPE IF EXISTS status_type CASCADE;

-- Create ENUMs
CREATE TYPE staff_role AS ENUM ('admin', 'manager', 'staff', 'kitchen');
CREATE TYPE shift_type AS ENUM ('morning', 'evening', 'night', 'flexible');
CREATE TYPE status_type AS ENUM ('active', 'inactive', 'on_leave');

-- Create staff table
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

-- Create indexes
CREATE INDEX idx_staff_franchise ON staff(franchise_id);
CREATE INDEX idx_staff_role ON staff(role);
CREATE INDEX idx_staff_status ON staff(status);
CREATE INDEX idx_staff_email ON staff(email);

-- Enable RLS
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Staff view own franchise data" ON staff
    FOR SELECT TO authenticated
    USING (
        franchise_id IN (
            SELECT franchise_id FROM staff WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "Managers can modify staff data" ON staff
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff 
            WHERE auth_id = auth.uid() 
            AND role IN ('admin', 'manager')
            AND franchise_id = staff.franchise_id
        )
    );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER staff_updated_at
    BEFORE UPDATE ON staff
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- Function to initialize system with sample data
CREATE OR REPLACE FUNCTION initialize_staff_system(franchise_id_param UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Create admin staff member
    INSERT INTO staff (
        franchise_id,
        full_name,
        email,
        role,
        can_void_orders,
        can_modify_menu,
        can_manage_staff
    ) VALUES (
        franchise_id_param,
        'Admin User',
        'admin@franchise.com',
        'admin',
        true,
        true,
        true
    );

    -- Create manager
    INSERT INTO staff (
        franchise_id,
        full_name,
        email,
        role,
        can_void_orders,
        can_modify_menu,
        can_manage_staff
    ) VALUES (
        franchise_id_param,
        'Manager User',
        'manager@franchise.com',
        'manager',
        true,
        true,
        true
    );

    -- Create staff
    INSERT INTO staff (
        franchise_id,
        full_name,
        email,
        role
    ) VALUES (
        franchise_id_param,
        'Staff User',
        'staff@franchise.com',
        'staff'
    );

    -- Create kitchen staff
    INSERT INTO staff (
        franchise_id,
        full_name,
        email,
        role
    ) VALUES (
        franchise_id_param,
        'Kitchen User',
        'kitchen@franchise.com',
        'kitchen'
    );
END;
$$;

-- Note: Initialize system with:
-- SELECT initialize_staff_system('your-franchise-id-here');
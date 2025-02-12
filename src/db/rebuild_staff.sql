-- Drop existing types and tables
DROP TYPE IF EXISTS staff_role CASCADE;
DROP TYPE IF EXISTS shift_type CASCADE;
DROP TYPE IF EXISTS status_type CASCADE;
DROP TABLE IF EXISTS staff CASCADE;

-- Create types
CREATE TYPE staff_role AS ENUM ('admin', 'manager', 'staff', 'kitchen');
CREATE TYPE shift_type AS ENUM ('morning', 'evening', 'night', 'flexible');
CREATE TYPE status_type AS ENUM ('active', 'inactive', 'on_leave');

-- Create staff table with clear structure
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
    auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Basic info
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    pin_code VARCHAR(4),
    
    -- Role and status
    role staff_role NOT NULL,
    status status_type NOT NULL DEFAULT 'active',
    shift shift_type,
    
    -- Work details
    hourly_rate DECIMAL(10,2),
    joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Permissions (simplified)
    can_void_orders BOOLEAN NOT NULL DEFAULT false,
    can_modify_menu BOOLEAN NOT NULL DEFAULT false,
    can_manage_staff BOOLEAN NOT NULL DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT valid_pin CHECK (pin_code ~ '^[0-9]{4}$')
);

-- Indexes
CREATE INDEX staff_franchise_id_idx ON staff(franchise_id);
CREATE INDEX staff_role_idx ON staff(role);
CREATE INDEX staff_status_idx ON staff(status);
CREATE INDEX staff_auth_id_idx ON staff(auth_id);

-- Enable RLS
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff members can view their own franchise staff"
    ON staff FOR SELECT
    USING (
        franchise_id IN (
            SELECT franchise_id FROM staff 
            WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "Managers can manage their franchise staff"
    ON staff FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM staff
            WHERE auth_id = auth.uid()
            AND role IN ('admin', 'manager')
            AND franchise_id = staff.franchise_id
        )
    );

-- Function to get franchise staff
CREATE OR REPLACE FUNCTION get_franchise_staff(franchise_id_input UUID)
RETURNS SETOF staff
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT s.*
    FROM staff s
    WHERE s.franchise_id = franchise_id_input
    ORDER BY s.full_name;
END;
$$;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_staff_updated_at
    BEFORE UPDATE ON staff
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE staff IS 'Staff members of franchises';
COMMENT ON COLUMN staff.auth_id IS 'Link to auth.users for those with login access';
COMMENT ON COLUMN staff.role IS 'Primary role: admin, manager, staff, kitchen';
COMMENT ON COLUMN staff.pin_code IS '4-digit PIN for POS access';
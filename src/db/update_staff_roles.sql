-- First, verify current staff roles
SELECT 
    email,
    role,
    can_manage_staff,
    can_void_orders,
    can_modify_menu,
    auth_id IS NOT NULL as has_auth
FROM staff;

-- Update any incorrect roles to match our new schema
UPDATE staff
SET 
    role = 'admin',
    can_manage_staff = true,
    can_void_orders = true,
    can_modify_menu = true,
    status = 'active'
WHERE email = 'admin@franchise.com';

-- Update manager permissions
UPDATE staff
SET 
    can_manage_staff = true,
    can_void_orders = true,
    can_modify_menu = true
WHERE role = 'manager';

-- Update staff permissions
UPDATE staff
SET 
    can_manage_staff = false,
    can_void_orders = false,
    can_modify_menu = false
WHERE role = 'staff';

-- Update kitchen permissions
UPDATE staff
SET 
    can_manage_staff = false,
    can_void_orders = false,
    can_modify_menu = false
WHERE role = 'kitchen';

-- Verify the changes
SELECT 
    email,
    role,
    can_manage_staff,
    can_void_orders,
    can_modify_menu,
    status,
    auth_id IS NOT NULL as has_auth
FROM staff
ORDER BY role;

-- Add RLS policy to ensure staff can only access their franchise
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_franchise_access_policy ON staff
    FOR ALL
    TO authenticated
    USING (franchise_id IN (
        SELECT franchise_id 
        FROM staff 
        WHERE auth_id = auth.uid()
    ));

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON staff TO authenticated;
GRANT USAGE ON SEQUENCE staff_id_seq TO authenticated;
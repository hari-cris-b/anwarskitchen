-- Begin transaction
BEGIN;

-- Drop existing policies first
DROP POLICY IF EXISTS "Staff can view own franchise" ON franchises;
DROP POLICY IF EXISTS "Staff can view franchise orders" ON orders;
DROP POLICY IF EXISTS "Staff can access order items of their franchise" ON order_items;
DROP POLICY IF EXISTS "menu_items_franchise_access" ON menu_items;
DROP POLICY IF EXISTS "Users can view their own franchise access" ON user_franchise_access;
DROP POLICY IF EXISTS "Staff can access own franchise records" ON user_franchise_access;
DROP POLICY IF EXISTS "Super admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Super admins can manage all orders" ON orders;
DROP POLICY IF EXISTS "Super admins can view all menu items" ON menu_items;
DROP POLICY IF EXISTS "Super admins can manage all menu items" ON menu_items;

-- Recreate franchise access policies
CREATE POLICY "Staff can view own franchise" ON franchises
    FOR SELECT
    USING (
        id IN (
            SELECT franchise_id 
            FROM staff 
            WHERE auth_id = auth.uid()
        )
    );

-- Recreate order policies
CREATE POLICY "Staff can view franchise orders" ON orders
    FOR SELECT
    USING (
        franchise_id IN (
            SELECT franchise_id 
            FROM staff 
            WHERE auth_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM staff 
            WHERE auth_id = auth.uid() 
            AND staff_type = 'super_admin'::staff_role
        )
    );

-- Recreate order items policies
CREATE POLICY "Staff can access order items of their franchise" ON order_items
    FOR SELECT
    USING (
        order_id IN (
            SELECT o.id 
            FROM orders o 
            JOIN staff s ON s.franchise_id = o.franchise_id 
            WHERE s.auth_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM staff 
            WHERE auth_id = auth.uid() 
            AND staff_type = 'super_admin'::staff_role
        )
    );

-- Recreate menu items policies
CREATE POLICY "menu_items_franchise_access" ON menu_items
    FOR SELECT
    USING (
        franchise_id IN (
            SELECT franchise_id 
            FROM staff 
            WHERE auth_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM staff 
            WHERE auth_id = auth.uid() 
            AND staff_type = 'super_admin'::staff_role
        )
    );

-- Recreate user franchise access policies
CREATE POLICY "Users can view their own franchise access" ON user_franchise_access
    FOR SELECT
    USING (auth_id = auth.uid());

CREATE POLICY "Staff can access own franchise records" ON user_franchise_access
    FOR SELECT
    USING (
        franchise_id IN (
            SELECT franchise_id 
            FROM staff 
            WHERE auth_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM staff 
            WHERE auth_id = auth.uid() 
            AND staff_type = 'super_admin'::staff_role
        )
    );

-- Add super admin bypass policies
CREATE POLICY "Super admins can view all orders" ON orders
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM staff 
            WHERE auth_id = auth.uid() 
            AND staff_type = 'super_admin'::staff_role
        )
    );

CREATE POLICY "Super admins can manage all orders" ON orders
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM staff 
            WHERE auth_id = auth.uid() 
            AND staff_type = 'super_admin'::staff_role
        )
    );

CREATE POLICY "Super admins can view all menu items" ON menu_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM staff 
            WHERE auth_id = auth.uid() 
            AND staff_type = 'super_admin'::staff_role
        )
    );

CREATE POLICY "Super admins can manage all menu items" ON menu_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM staff 
            WHERE auth_id = auth.uid() 
            AND staff_type = 'super_admin'::staff_role
        )
    );

-- Enable RLS on all tables
ALTER TABLE franchises ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_franchise_access ENABLE ROW LEVEL SECURITY;

-- Add comments
COMMENT ON POLICY "Staff can view own franchise" ON franchises IS 
'Allows staff to view their assigned franchise';

COMMENT ON POLICY "Staff can view franchise orders" ON orders IS 
'Allows staff to view orders from their franchise';

COMMENT ON POLICY "Staff can access order items of their franchise" ON order_items IS 
'Allows staff to view order items from their franchise';

COMMENT ON POLICY "menu_items_franchise_access" ON menu_items IS 
'Controls access to menu items based on franchise assignment';

COMMENT ON POLICY "Users can view their own franchise access" ON user_franchise_access IS 
'Allows users to view their franchise access records';

COMMENT ON POLICY "Super admins can view all orders" ON orders IS 
'Gives super admins full read access to all orders';

COMMENT ON POLICY "Super admins can manage all orders" ON orders IS 
'Gives super admins full management access to all orders';

COMMENT ON POLICY "Super admins can view all menu items" ON menu_items IS 
'Gives super admins full read access to all menu items';

COMMENT ON POLICY "Super admins can manage all menu items" ON menu_items IS 
'Gives super admins full management access to all menu items';

COMMIT;
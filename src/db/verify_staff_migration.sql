-- Verify staff table and related objects
WITH verification AS (
    SELECT
        -- Basic table verification
        EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' AND tablename = 'staff'
        ) as staff_table_exists,

        -- Verify ENUMs
        EXISTS (
            SELECT 1 FROM pg_type 
            WHERE typname = 'staff_role'
        ) as staff_role_type_exists,
        
        EXISTS (
            SELECT 1 FROM pg_type 
            WHERE typname = 'shift_type'
        ) as shift_type_exists,
        
        EXISTS (
            SELECT 1 FROM pg_type 
            WHERE typname = 'status_type'
        ) as status_type_exists,

        -- Verify indexes
        EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'staff' AND indexname = 'idx_staff_franchise'
        ) as franchise_index_exists,
        
        EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'staff' AND indexname = 'idx_staff_role'
        ) as role_index_exists,
        
        -- Verify RLS is enabled
        EXISTS (
            SELECT 1 FROM pg_tables t
            JOIN pg_class c ON c.relname = t.tablename
            WHERE t.schemaname = 'public' 
            AND t.tablename = 'staff'
            AND c.relrowsecurity = true
        ) as rls_enabled,

        -- Verify RLS policies exist
        EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'staff'
        ) as has_rls_policies,

        -- Count RLS policies
        (
            SELECT COUNT(*) 
            FROM pg_policies 
            WHERE tablename = 'staff'
        ) as rls_policy_count
)
SELECT 
    verification.*,
    -- Data integrity checks
    (
        SELECT COUNT(*) 
        FROM staff
    ) as total_staff_count,
    
    (
        SELECT COUNT(*) 
        FROM staff 
        WHERE auth_id IS NOT NULL
    ) as authenticated_staff_count,
    
    (
        SELECT jsonb_build_object(
            'admin', COUNT(*) FILTER (WHERE role = 'admin'),
            'manager', COUNT(*) FILTER (WHERE role = 'manager'),
            'staff', COUNT(*) FILTER (WHERE role = 'staff'),
            'kitchen', COUNT(*) FILTER (WHERE role = 'kitchen')
        )
        FROM staff
    ) as role_distribution,
    
    -- Verify permissions setup
    (
        SELECT jsonb_build_object(
            'void_orders', COUNT(*) FILTER (WHERE can_void_orders),
            'modify_menu', COUNT(*) FILTER (WHERE can_modify_menu),
            'manage_staff', COUNT(*) FILTER (WHERE can_manage_staff)
        )
        FROM staff
    ) as permissions_distribution,
    
    -- Verify constraints
    (
        SELECT COUNT(*) 
        FROM staff 
        WHERE pin_code IS NOT NULL 
        AND pin_code !~ '^[0-9]{4}$'
    ) as invalid_pin_codes,
    
    -- Check for orphaned records
    (
        SELECT COUNT(*) 
        FROM staff s
        LEFT JOIN franchises f ON f.id = s.franchise_id
        WHERE f.id IS NULL
    ) as orphaned_staff_count
FROM verification;
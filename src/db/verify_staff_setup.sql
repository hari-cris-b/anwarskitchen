-- Drop existing function if it exists
DROP FUNCTION IF EXISTS verify_staff_setup();

-- Create verification function
CREATE OR REPLACE FUNCTION verify_staff_setup()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    verification JSONB;
BEGIN
    verification = jsonb_build_object(
        -- Table verification
        'table_exists', (
            SELECT EXISTS (
                SELECT 1 FROM pg_tables 
                WHERE schemaname = 'public' AND tablename = 'staff'
            )
        ),
        
        -- Types verification
        'types', jsonb_build_object(
            'staff_role', EXISTS (
                SELECT 1 FROM pg_type WHERE typname = 'staff_role'
            ),
            'shift_type', EXISTS (
                SELECT 1 FROM pg_type WHERE typname = 'shift_type'
            ),
            'status_type', EXISTS (
                SELECT 1 FROM pg_type WHERE typname = 'status_type'
            )
        ),
        
        -- Index verification
        'indexes', jsonb_build_object(
            'franchise_idx', EXISTS (
                SELECT 1 FROM pg_indexes 
                WHERE tablename = 'staff' AND indexname = 'idx_staff_franchise'
            ),
            'role_idx', EXISTS (
                SELECT 1 FROM pg_indexes 
                WHERE tablename = 'staff' AND indexname = 'idx_staff_role'
            )
        ),
        
        -- RLS verification
        'rls_enabled', (
            SELECT c.relrowsecurity 
            FROM pg_class c 
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relname = 'staff'
        ),
        
        -- Data summary
        'data_summary', jsonb_build_object(
            'total_staff', (SELECT COUNT(*) FROM staff),
            'role_counts', (
                SELECT jsonb_build_object(
                    'admin', COUNT(*) FILTER (WHERE role = 'admin'),
                    'manager', COUNT(*) FILTER (WHERE role = 'manager'),
                    'staff', COUNT(*) FILTER (WHERE role = 'staff'),
                    'kitchen', COUNT(*) FILTER (WHERE role = 'kitchen')
                )
                FROM staff
            ),
            'authenticated_count', (
                SELECT COUNT(*) FROM staff WHERE auth_id IS NOT NULL
            ),
            'with_pin_codes', (
                SELECT COUNT(*) FROM staff WHERE pin_code IS NOT NULL
            )
        ),
        
        -- Permissions summary
        'permissions_summary', (
            SELECT jsonb_build_object(
                'void_orders', COUNT(*) FILTER (WHERE can_void_orders),
                'modify_menu', COUNT(*) FILTER (WHERE can_modify_menu),
                'manage_staff', COUNT(*) FILTER (WHERE can_manage_staff)
            )
            FROM staff
        ),
        
        -- Verify constraints
        'constraint_violations', jsonb_build_object(
            'invalid_pin_codes', (
                SELECT COUNT(*) 
                FROM staff 
                WHERE pin_code IS NOT NULL 
                AND pin_code !~ '^[0-9]{4}$'
            ),
            'orphaned_staff', (
                SELECT COUNT(*) 
                FROM staff s
                LEFT JOIN franchises f ON f.id = s.franchise_id
                WHERE f.id IS NULL
            )
        )
    );

    RETURN verification;
END;
$$;

-- Example usage:
-- SELECT verify_staff_setup();
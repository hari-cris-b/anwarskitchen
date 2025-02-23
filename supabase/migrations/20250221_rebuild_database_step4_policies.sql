-- Enable RLS and create policies

-- Step 1: Enable RLS on all tables
DO $enable_rls$
BEGIN
    ALTER TABLE public.franchises ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.franchise_settings ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.staff_activity ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.super_admin ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.super_admin_activity ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.user_franchise_access ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on all tables';
END $enable_rls$;

-- Step 2: Drop existing policies
DO $drop_policies$
BEGIN
    DROP POLICY IF EXISTS super_admin_full_access ON public.franchises;
    DROP POLICY IF EXISTS staff_franchise_access ON public.franchises;
    DROP POLICY IF EXISTS super_admin_full_access ON public.franchise_settings;
    DROP POLICY IF EXISTS staff_franchise_access ON public.franchise_settings;
    DROP POLICY IF EXISTS super_admin_full_access ON public.menu_items;
    DROP POLICY IF EXISTS staff_franchise_access ON public.menu_items;
    DROP POLICY IF EXISTS super_admin_full_access ON public.orders;
    DROP POLICY IF EXISTS staff_franchise_access ON public.orders;
    DROP POLICY IF EXISTS super_admin_full_access ON public.order_items;
    DROP POLICY IF EXISTS staff_franchise_access ON public.order_items;
    DROP POLICY IF EXISTS super_admin_full_access ON public.staff;
    DROP POLICY IF EXISTS staff_franchise_access ON public.staff;
    DROP POLICY IF EXISTS super_admin_full_access ON public.staff_activity;
    DROP POLICY IF EXISTS staff_franchise_access ON public.staff_activity;
    DROP POLICY IF EXISTS super_admin_access ON public.super_admin;
    DROP POLICY IF EXISTS super_admin_full_access ON public.super_admin_activity;
    DROP POLICY IF EXISTS super_admin_full_access ON public.user_franchise_access;
    DROP POLICY IF EXISTS staff_franchise_access ON public.user_franchise_access;
    RAISE NOTICE 'Dropped existing policies';
END $drop_policies$;

-- Step 3: Create policies for super_admin table (special handling)
DO $super_admin_policies$
BEGIN
    -- Allow super admins to see only their own record and manage other super admins
    CREATE POLICY super_admin_access ON public.super_admin
        FOR ALL 
        USING (
            auth_id = auth.uid() 
            OR EXISTS (
                SELECT 1 FROM public.super_admin 
                WHERE auth_id = auth.uid()
            )
        );
    RAISE NOTICE 'Created super_admin table policies';
END $super_admin_policies$;

-- Step 4: Create policies for other tables
DO $create_policies$
BEGIN
    -- Franchises
    CREATE POLICY super_admin_full_access ON public.franchises FOR ALL 
        USING (EXISTS (SELECT 1 FROM public.super_admin WHERE auth_id = auth.uid()));
    CREATE POLICY staff_franchise_access ON public.franchises FOR SELECT 
        USING (id IN (SELECT franchise_id FROM public.user_franchise_access WHERE auth_id = auth.uid()));

    -- Franchise Settings
    CREATE POLICY super_admin_full_access ON public.franchise_settings FOR ALL 
        USING (EXISTS (SELECT 1 FROM public.super_admin WHERE auth_id = auth.uid()));
    CREATE POLICY staff_franchise_access ON public.franchise_settings FOR SELECT 
        USING (franchise_id IN (SELECT franchise_id FROM public.user_franchise_access WHERE auth_id = auth.uid()));

    -- Menu Items
    CREATE POLICY super_admin_full_access ON public.menu_items FOR ALL 
        USING (EXISTS (SELECT 1 FROM public.super_admin WHERE auth_id = auth.uid()));
    CREATE POLICY staff_franchise_access ON public.menu_items FOR SELECT 
        USING (franchise_id IN (SELECT franchise_id FROM public.user_franchise_access WHERE auth_id = auth.uid()));

    -- Orders
    CREATE POLICY super_admin_full_access ON public.orders FOR ALL 
        USING (EXISTS (SELECT 1 FROM public.super_admin WHERE auth_id = auth.uid()));
    CREATE POLICY staff_franchise_access ON public.orders FOR ALL 
        USING (franchise_id IN (SELECT franchise_id FROM public.user_franchise_access WHERE auth_id = auth.uid()));

    -- Order Items
    CREATE POLICY super_admin_full_access ON public.order_items FOR ALL 
        USING (EXISTS (SELECT 1 FROM public.super_admin WHERE auth_id = auth.uid()));
    CREATE POLICY staff_franchise_access ON public.order_items FOR ALL 
        USING (order_id IN (
            SELECT id FROM public.orders WHERE franchise_id IN (
                SELECT franchise_id FROM public.user_franchise_access WHERE auth_id = auth.uid()
            )
        ));

    -- Staff
    CREATE POLICY super_admin_full_access ON public.staff FOR ALL 
        USING (EXISTS (SELECT 1 FROM public.super_admin WHERE auth_id = auth.uid()));
    CREATE POLICY staff_franchise_access ON public.staff FOR SELECT 
        USING (franchise_id IN (SELECT franchise_id FROM public.user_franchise_access WHERE auth_id = auth.uid()));

    -- Staff Activity
    CREATE POLICY super_admin_full_access ON public.staff_activity FOR ALL 
        USING (EXISTS (SELECT 1 FROM public.super_admin WHERE auth_id = auth.uid()));
    CREATE POLICY staff_franchise_access ON public.staff_activity FOR SELECT 
        USING (staff_id IN (
            SELECT id FROM public.staff WHERE franchise_id IN (
                SELECT franchise_id FROM public.user_franchise_access WHERE auth_id = auth.uid()
            )
        ));

    -- Super Admin Activity
    CREATE POLICY super_admin_full_access ON public.super_admin_activity FOR ALL 
        USING (EXISTS (SELECT 1 FROM public.super_admin WHERE auth_id = auth.uid()));

    -- User Franchise Access
    CREATE POLICY super_admin_full_access ON public.user_franchise_access FOR ALL 
        USING (EXISTS (SELECT 1 FROM public.super_admin WHERE auth_id = auth.uid()));
    CREATE POLICY staff_franchise_access ON public.user_franchise_access FOR SELECT 
        USING (auth_id = auth.uid());

    RAISE NOTICE 'Created all table policies';
END $create_policies$;

-- Step 5: Test policies
DO $test_policies$
DECLARE
    v_policy_count int;
    v_table_name text;
    v_tables text[] := ARRAY[
        'franchises', 'franchise_settings', 'menu_items', 'orders', 'order_items',
        'staff', 'staff_activity', 'super_admin', 'super_admin_activity', 'user_franchise_access'
    ];
BEGIN
    -- Check policy count
    SELECT COUNT(*) INTO v_policy_count FROM pg_policies WHERE schemaname = 'public';
    IF v_policy_count < 19 THEN
        RAISE EXCEPTION 'Expected at least 19 policies, found %', v_policy_count;
    END IF;
    
    -- Verify RLS is enabled on all tables
    FOR v_table_name IN SELECT unnest(v_tables)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename = v_table_name 
            AND rowsecurity = true
        ) THEN
            RAISE EXCEPTION 'RLS not enabled on table: %', v_table_name;
        END IF;
    END LOOP;

    -- Verify super admin policies exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Super admin policies not found';
    END IF;

    -- Verify franchise access policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'franchises' 
        AND (policyname LIKE '%super_admin%' OR policyname LIKE '%staff%')
    ) THEN
        RAISE EXCEPTION 'Franchise access policies not found';
    END IF;

    RAISE NOTICE '
        Policy verification complete:
        - Total policies: %
        - RLS enabled on all tables
        - Super admin policies verified
        - Staff access policies verified
    ', v_policy_count;

END $test_policies$;

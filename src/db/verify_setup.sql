-- STEP 1: Check table existence and structure
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('staff', 'franchises', 'profiles')
ORDER BY table_name, ordinal_position;

-- STEP 2: Check if current user has proper access
SELECT 
    auth.role() as current_role,
    has_table_privilege('staff', 'SELECT') as can_select_staff,
    has_table_privilege('franchises', 'SELECT') as can_select_franchises,
    has_table_privilege('profiles', 'SELECT') as can_select_profiles;

-- STEP 3: Check user's franchise association
WITH user_info AS (
    SELECT 
        auth.uid() as user_id,
        p.franchise_id,
        p.role as user_role,
        f.name as franchise_name
    FROM profiles p
    LEFT JOIN franchises f ON f.id = p.franchise_id
    WHERE p.id = auth.uid()
)
SELECT * FROM user_info;

-- STEP 4: Verify staff data for user's franchise
WITH user_franchise AS (
    SELECT franchise_id 
    FROM profiles 
    WHERE id = auth.uid()
)
SELECT 
    COUNT(*) as total_staff,
    COUNT(CASE WHEN role = 'manager' THEN 1 END) as managers,
    COUNT(CASE WHEN role = 'chef' THEN 1 END) as chefs,
    COUNT(CASE WHEN role IN ('waiter', 'cashier') THEN 1 END) as staff
FROM staff s
WHERE s.franchise_id = (SELECT franchise_id FROM user_franchise);

-- STEP 5: Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('staff', 'franchises', 'profiles');

-- STEP 6: Check for data inconsistencies
SELECT 
    'Orphaned staff (no franchise)' as issue,
    COUNT(*) as count
FROM staff s
LEFT JOIN franchises f ON f.id = s.franchise_id
WHERE f.id IS NULL
UNION ALL
SELECT 
    'Users without profiles' as issue,
    COUNT(*) as count
FROM auth.users u
LEFT JOIN profiles p ON p.user_id = u.id
WHERE p.id IS NULL
UNION ALL
SELECT 
    'Profiles without franchises' as issue,
    COUNT(*) as count
FROM profiles p
LEFT JOIN franchises f ON f.id = p.franchise_id
WHERE f.id IS NULL AND p.role != 'owner';

-- STEP 7: Quick troubleshooting guides based on results
DO $$
BEGIN
    -- Check if current user can access their profile
    IF NOT EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid()
    ) THEN
        RAISE NOTICE 'ISSUE: Current user has no profile';
    END IF;

    -- Check if current user has franchise association
    IF NOT EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND franchise_id IS NOT NULL
    ) THEN
        RAISE NOTICE 'ISSUE: Current user not associated with any franchise';
    END IF;

    -- Check if franchise has any staff
    IF EXISTS (
        SELECT 1 
        FROM profiles p
        LEFT JOIN staff s ON s.franchise_id = p.franchise_id
        WHERE p.id = auth.uid() 
        AND p.franchise_id IS NOT NULL 
        AND s.id IS NULL
    ) THEN
        RAISE NOTICE 'ISSUE: No staff members found for user''s franchise';
    END IF;
END $$;

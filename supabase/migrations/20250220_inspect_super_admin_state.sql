-- Begin transaction
BEGIN;

-- Check existing functions
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname IN ('is_super_admin', 'check_super_admin');

-- Check existing policies on super_admin table
SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'super_admin';

-- Check existing policies on super_admin_activity table
SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'super_admin_activity';

-- Check table structure and permissions
SELECT 
    c.relname as table_name,
    CASE c.relrowsecurity 
        WHEN true THEN 'RLS enabled'
        ELSE 'RLS disabled'
    END as rls_status,
    c.relowner::regrole as owner,
    array_agg(a.rolname) as grantees
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
LEFT JOIN pg_auth_members m ON m.member = c.relowner
LEFT JOIN pg_authid a ON a.oid = m.roleid
WHERE n.nspname = 'public' 
AND c.relname IN ('super_admin', 'super_admin_activity')
GROUP BY c.relname, c.relrowsecurity, c.relowner;

-- Show table dependencies
SELECT DISTINCT
    d.refclassid::regclass as dependent_object_type,
    d.refobjid::regclass as dependent_object,
    d.deptype,
    d.classid::regclass as object_type,
    d.objid::regclass as object_name
FROM pg_depend d
JOIN pg_class c ON d.refobjid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' 
AND c.relname IN ('super_admin', 'super_admin_activity');

-- Show actual data count
SELECT 
    'super_admin' as table_name, 
    count(*) as row_count 
FROM super_admin
UNION ALL
SELECT 
    'super_admin_activity' as table_name, 
    count(*) as row_count 
FROM super_admin_activity;

COMMIT;
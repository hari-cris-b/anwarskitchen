-- 1. Inspect function definitions
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as argument_types,
    pg_get_function_result(p.oid) as return_type,
    obj_description(p.oid, 'pg_proc') as description,
    p.prosecdef as security_definer
FROM pg_proc p
LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('is_super_admin', 'get_user_role')
ORDER BY p.proname;

-- 2. Inspect policy dependencies
SELECT 
    pol.polname as policy_name,
    tabname.relname as table_name,
    pg_get_expr(pol.polqual, tabname.oid) as using_expression,
    pg_get_expr(pol.polwithcheck, tabname.oid) as check_expression,
    pol.polcmd as command_type
FROM pg_policy pol
JOIN pg_class tabname ON pol.polrelid = tabname.oid
WHERE pg_get_expr(pol.polqual, tabname.oid) LIKE '%is_super_admin%'
   OR pg_get_expr(pol.polwithcheck, tabname.oid) LIKE '%is_super_admin%';

-- 3. Inspect function dependencies
SELECT DISTINCT
    dp.refobjid::regproc as referenced_function,
    dp.objid::regproc as dependent_function,
    dp.deptype as dependency_type
FROM pg_depend dp
JOIN pg_proc p ON dp.refobjid = p.oid
WHERE p.proname IN ('is_super_admin', 'get_user_role')
AND dp.deptype != 'i'  -- Exclude implicit dependencies
AND dp.classid = 'pg_proc'::regclass;

-- 4. Inspect related tables
SELECT 
    c.relname as table_name,
    a.attname as column_name,
    pg_get_expr(d.adbin, d.adrelid) as default_value,
    t.typname as data_type,
    a.attnotnull as not_null
FROM pg_class c
JOIN pg_attribute a ON c.oid = a.attrelid
JOIN pg_type t ON a.atttypid = t.oid
LEFT JOIN pg_attrdef d ON c.oid = d.adrelid AND a.attnum = d.adnum
WHERE c.relname = 'super_admin'
AND a.attnum > 0
AND NOT a.attisdropped
ORDER BY a.attnum;

-- 5. Inspect permissions
SELECT
    c.relname as table_name,
    CASE WHEN has_table_privilege(r.rolname, c.oid, 'SELECT') THEN 'SELECT' END as select_priv,
    CASE WHEN has_table_privilege(r.rolname, c.oid, 'INSERT') THEN 'INSERT' END as insert_priv,
    CASE WHEN has_table_privilege(r.rolname, c.oid, 'UPDATE') THEN 'UPDATE' END as update_priv,
    CASE WHEN has_table_privilege(r.rolname, c.oid, 'DELETE') THEN 'DELETE' END as delete_priv
FROM pg_class c
CROSS JOIN pg_roles r
WHERE c.relname = 'super_admin'
AND r.rolname = 'authenticated'
AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 6. List existing triggers
SELECT 
    t.tgname as trigger_name,
    c.relname as table_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'super_admin'
AND NOT t.tgisinternal;
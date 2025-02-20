-- Inspect existing metric functions
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as argument_types,
    pg_get_function_result(p.oid) as return_type,
    obj_description(p.oid, 'pg_proc') as description,
    p.prosecdef as security_definer
FROM pg_proc p
LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
    'get_total_revenue_last_30_days',
    'get_total_active_staff_count',
    'get_top_performing_franchises'
);

-- Check function dependencies
SELECT DISTINCT
    dp.refobjid::regproc as referenced_function,
    dp.objid::regproc as dependent_function,
    dp.deptype as dependency_type
FROM pg_depend dp
JOIN pg_proc p ON dp.refobjid = p.oid
WHERE p.proname IN (
    'get_total_revenue_last_30_days',
    'get_total_active_staff_count',
    'get_top_performing_franchises'
)
AND dp.deptype != 'i'  -- Exclude implicit dependencies
AND dp.classid = 'pg_proc'::regclass;
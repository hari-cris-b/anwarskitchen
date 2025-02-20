-- Check all functions that reference orders table
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND pg_get_functiondef(p.oid) ILIKE '%orders%';

-- Check any aggregations or calculations involving orders
SELECT 
    c.relname as table_name,
    a.attname as column_name,
    t.typname as data_type,
    d.deptype as dependency_type,
    r.ev_class::regclass as referenced_by
FROM pg_depend d
JOIN pg_rewrite r ON r.oid = d.objid
JOIN pg_class c ON c.oid = d.refobjid
JOIN pg_attribute a ON (a.attrelid, a.attnum) = (d.refobjid, d.refobjsubid)
JOIN pg_type t ON t.oid = a.atttypid
WHERE c.relname = 'orders'
AND d.deptype != 'i'  -- Exclude implicit dependencies
ORDER BY c.relname, a.attnum;
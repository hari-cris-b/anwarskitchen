-- Check all existing functions' source code for references to orders and amounts
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition,
    obj_description(p.oid, 'pg_proc') as description,
    p.prorettype::regtype as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND (
    pg_get_functiondef(p.oid) ILIKE '%orders%'
    OR p.proname ILIKE '%order%'
    OR p.proname ILIKE '%revenue%'
    OR p.proname ILIKE '%total%'
    OR p.proname ILIKE '%amount%'
)
AND p.proname != ALL(ARRAY[
    'get_total_revenue_last_30_days',
    'get_top_performing_franchises'
])
ORDER BY p.proname;

-- Check table structure again with explicit casting to expose computed columns
SELECT 
    c.relname as table_name,
    a.attname as column_name,
    pg_get_expr(d.adbin, d.adrelid) as default_value,
    CASE 
        WHEN t.typname = 'numeric' THEN 'numeric'
        WHEN t.typname = 'int4' THEN 'integer'
        WHEN t.typname = 'int8' THEN 'bigint'
        ELSE t.typname
    END as data_type,
    a.attnotnull as not_null
FROM pg_class c
JOIN pg_attribute a ON c.oid = a.attrelid
JOIN pg_type t ON a.atttypid = t.oid
LEFT JOIN pg_attrdef d ON c.oid = d.adrelid AND a.attnum = d.adnum
WHERE c.relname = 'orders'
AND a.attnum > 0
AND NOT a.attisdropped
ORDER BY a.attnum;

-- Check RPC function results directly
SELECT proname, prosrc
FROM pg_proc 
WHERE proname IN (
    SELECT specific_name
    FROM information_schema.routines
    WHERE specific_schema = 'public'
    AND routine_definition ILIKE '%orders%amount%'
);
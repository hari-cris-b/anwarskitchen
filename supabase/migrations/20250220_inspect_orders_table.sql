-- Get orders table structure
SELECT 
    a.attname as column_name,
    pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
    pg_get_expr(d.adbin, d.adrelid) as column_default,
    a.attnotnull as not_null
FROM pg_catalog.pg_attribute a
LEFT JOIN pg_catalog.pg_attrdef d ON (a.attrelid, a.attnum) = (d.adrelid, d.adnum)
WHERE a.attnum > 0 
AND NOT a.attisdropped
AND a.attrelid = 'orders'::regclass
ORDER BY a.attnum;

-- Check any related views
SELECT 
    viewname,
    definition
FROM pg_views
WHERE schemaname = 'public'
AND definition ILIKE '%orders%';

-- Check any columns that might be about amounts/totals
SELECT 
    table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND (
    column_name ILIKE '%amount%'
    OR column_name ILIKE '%total%'
    OR column_name ILIKE '%price%'
    OR column_name ILIKE '%revenue%'
)
ORDER BY table_name, column_name;
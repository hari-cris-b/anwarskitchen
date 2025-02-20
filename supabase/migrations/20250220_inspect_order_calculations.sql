-- Check trigger functions on orders table
SELECT 
    t.tgname as trigger_name,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'orders';

-- Check materialized views referencing orders
SELECT 
    schemaname,
    matviewname,
    definition
FROM pg_matviews
WHERE schemaname = 'public'
AND definition ILIKE '%orders%';

-- Check existing order total calculations
SELECT 
    viewname,
    definition 
FROM pg_views 
WHERE schemaname = 'public' 
AND definition ILIKE '%sum%' 
AND definition ILIKE '%order%';

-- Look for columns named similarly to 'total'
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name SIMILAR TO '%(total|amount|price|sum|value)%';
-- Check order_items table structure
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'order_items';

-- Check order totals logic across related tables
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name IN ('orders', 'order_items', 'order_totals', 'order_summaries')
AND column_name SIMILAR TO '%(total|amount|price|sum|value)%';

-- Check any computed totals in views
SELECT 
    viewname,
    definition
FROM pg_views
WHERE schemaname = 'public'
AND (
    viewname LIKE '%order%'
    OR definition ILIKE '%order%total%'
    OR definition ILIKE '%sum%order%'
);

-- Check foreign key relationships
SELECT
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND (tc.table_name = 'orders' OR tc.table_name = 'order_items');
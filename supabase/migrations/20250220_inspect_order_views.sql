-- Find any used column names in views
WITH RECURSIVE view_references AS (
  -- Base case: direct references to orders table
  SELECT 
    v.viewname,
    v.definition,
    regexp_matches(v.definition, 'orders\.[a-zA-Z_]+', 'g') as column_refs
  FROM pg_views v
  WHERE schemaname = 'public'
  AND definition ILIKE '%orders%'
  
  UNION ALL
  
  -- Recursive case: views that reference other views
  SELECT 
    v.viewname,
    v.definition,
    regexp_matches(v.definition, vr.viewname || '\.[a-zA-Z_]+', 'g') as column_refs
  FROM pg_views v
  JOIN view_references vr ON v.definition ILIKE '%' || vr.viewname || '%'
  WHERE v.schemaname = 'public'
)
SELECT DISTINCT
  viewname,
  column_refs[1] as referenced_column
FROM view_references
WHERE column_refs[1] SIMILAR TO '.*(amount|total|price|sum|value)%'
ORDER BY viewname;

-- Check materialized views for order calculations
SELECT 
  m.matviewname,
  m.definition,
  regexp_matches(m.definition, 'orders\.[a-zA-Z_]+', 'g') as column_refs
FROM pg_matviews m
WHERE schemaname = 'public'
AND definition ILIKE '%orders%';

-- Look for any aggregate queries that work
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    t.typname as return_type,
    regexp_matches(pg_get_functiondef(p.oid), 'SUM\((.*?)\)', 'g') as sum_expressions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_type t ON p.prorettype = t.oid
WHERE n.nspname = 'public'
AND pg_get_functiondef(p.oid) ILIKE '%orders%'
AND pg_get_functiondef(p.oid) ILIKE '%sum%';
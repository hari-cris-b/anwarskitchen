-- Create function to analyze table structure
CREATE OR REPLACE FUNCTION analyze_table_structure(p_table_name text)
RETURNS TABLE (
    table_name text,
    column_details jsonb,
    foreign_keys jsonb,
    indexes jsonb,
    sample_data jsonb
) 
LANGUAGE plpgsql 
AS $$
BEGIN
    RETURN QUERY
    WITH column_info AS (
        SELECT 
            c.column_name,
            c.data_type,
            c.column_default,
            c.is_nullable,
            (SELECT pg_get_expr(d.adbin, d.adrelid) 
             FROM pg_catalog.pg_attrdef d
             WHERE d.adrelid = (c.table_name)::regclass 
             AND d.adnum = a.attnum) as generated_expr
        FROM information_schema.columns c
        JOIN pg_catalog.pg_attribute a 
          ON a.attname = c.column_name 
          AND a.attrelid = (c.table_name)::regclass
        WHERE c.table_name = p_table_name
        AND c.table_schema = 'public'
    ),
    fk_info AS (
        SELECT
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = p_table_name
        AND tc.constraint_type = 'FOREIGN KEY'
    ),
    index_info AS (
        SELECT
            i.relname AS index_name,
            array_agg(a.attname) AS column_names,
            ix.indisunique AS is_unique
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON ix.indexrelid = i.oid
        JOIN pg_attribute a ON a.attrelid = t.oid
        WHERE t.relname = p_table_name
        AND a.attnum = ANY(ix.indkey)
        GROUP BY i.relname, ix.indisunique
    ),
    sample_data AS (
        SELECT jsonb_agg(row_to_json(t))
        FROM (
            SELECT *
            FROM (SELECT * FROM (SELECT p_table_name::regclass)t) t2
            LIMIT 1
        ) t
    )
    SELECT 
        p_table_name,
        jsonb_agg(to_jsonb(column_info)),
        jsonb_agg(DISTINCT to_jsonb(fk_info)),
        jsonb_agg(DISTINCT to_jsonb(index_info)),
        (SELECT * FROM sample_data)
    FROM column_info;
END;
$$;

-- Analyze orders table structure
SELECT * FROM analyze_table_structure('orders');

-- Analyze order_items table structure
SELECT * FROM analyze_table_structure('order_items');

-- Look for related order calculations
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND (
    routine_definition ILIKE '%orders%'
    OR routine_definition ILIKE '%order_items%'
)
AND routine_type = 'FUNCTION';
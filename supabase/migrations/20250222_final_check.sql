-- Begin transaction
BEGIN;

-- Grant permissions to check auth schema version
GRANT SELECT ON information_schema.tables TO anon;

-- Select auth table names and columns to verify structure
DO $$
DECLARE
    version text;
BEGIN
    -- Check auth schema existence
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.schemata 
        WHERE schema_name = 'auth'
    ) THEN
        RAISE NOTICE 'Auth schema does not exist';
    END IF;

    -- Check auth.users structure
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'auth' 
        AND table_name = 'users'
    ) THEN
        RAISE NOTICE 'Auth users table does not exist';
    END IF;
END $$;

-- Grant required sequence permissions (if missing)
DO $$
DECLARE
    seq_name text;
BEGIN
    FOR seq_name IN 
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'auth'
    LOOP
        EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE auth.%I TO anon', seq_name);
    END LOOP;
END $$;

-- Log successful execution
DO $$
BEGIN
    RAISE NOTICE 'Auth system verification complete';
END $$;

COMMIT;

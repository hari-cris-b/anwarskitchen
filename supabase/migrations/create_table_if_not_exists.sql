-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create function to dynamically create tables if they don't exist
CREATE OR REPLACE FUNCTION create_table_if_not_exists(
  table_name text,
  definition text
)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = table_name
  ) THEN
    EXECUTE format('CREATE TABLE %I (%s)', table_name, definition);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

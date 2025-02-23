-- Step 1: Drop existing tables in reverse order of dependencies
DROP TABLE IF EXISTS public.super_admin_activity CASCADE;
DROP TABLE IF EXISTS public.staff_activity CASCADE;
DROP TABLE IF EXISTS public.user_franchise_access CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.menu_items CASCADE;
DROP TABLE IF EXISTS public.franchise_settings CASCADE;
DROP TABLE IF EXISTS public.staff CASCADE;
DROP TABLE IF EXISTS public.super_admin CASCADE;
DROP TABLE IF EXISTS public.franchises CASCADE;

-- Drop existing types and enums
DROP TYPE IF EXISTS public.staff_role CASCADE;
DROP TYPE IF EXISTS public.status_type CASCADE;
DROP TYPE IF EXISTS public.order_status CASCADE;

-- Step 2: Create types and enums
CREATE TYPE public.staff_role AS ENUM ('staff', 'kitchen', 'manager', 'admin', 'super_admin');
CREATE TYPE public.status_type AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE public.order_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- Enable Row Level Security on all tables by default
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, service_role;


--Output:
Success. No rows returned



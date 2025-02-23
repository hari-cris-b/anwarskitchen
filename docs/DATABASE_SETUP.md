# Database Setup Guide

## Prerequisites

- PostgreSQL 14+
- Supabase CLI
- psql command line tool

## Quick Start

1. **Initial Setup**
```bash
# Connect to database
psql "postgresql://postgres:[password]@localhost:54322/postgres"

# Run rebuild script
\i 'supabase/rebuild.sql'
```

2. **Verify Installation**
```sql
-- Check if super admin exists
SELECT * FROM public.super_admin WHERE email = 'harikrish120027@gmail.com';

-- Check if staff exists
SELECT * FROM public.staff WHERE email = 'haricrisb@gmail.com';
```

## Default Accounts

1. **Super Admin**
   - Email: harikrish120027@gmail.com
   - Auth ID: e739b600-aa23-4003-a812-82d9ca747638
   - Full system access

2. **Staff**
   - Email: haricrisb@gmail.com
   - Email verified: true
   - Basic access level

## Common Tasks

### 1. Reset Database
```bash
# Run complete rebuild
psql "postgresql://postgres:[password]@localhost:54322/postgres" -f supabase/rebuild.sql

# Verify setup
psql "postgresql://postgres:[password]@localhost:54322/postgres" -f supabase/migrations/20250221_verify_setup.sql
```

### 2. Add New Super Admin
```sql
-- First create auth user, then:
SELECT add_super_admin(
  'new_admin@example.com',
  'Admin Name',
  'auth_user_id'
);
```

### 3. Register Staff
```sql
-- First create auth user, then:
INSERT INTO public.staff (
  franchise_id,
  full_name,
  email,
  staff_type,
  email_verified
) VALUES (
  'franchise_id',
  'Staff Name',
  'staff@email.com',
  'staff',
  true
);
```

## Troubleshooting

### 1. Authentication Issues

If login not working:
```sql
-- Check if email exists
SELECT public.check_email_exists('user@email.com');

-- Check user type
SELECT public.get_user_type('user@email.com');

-- Verify RLS policies
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

### 2. Permission Issues

If access denied:
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Verify user permissions
SELECT grantee, table_schema, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee IN ('anon', 'authenticated')
AND table_schema = 'public';
```

### 3. Data Access Issues

If can't access data:
```sql
-- Test as authenticated user
SET ROLE authenticated;
SET request.jwt.claim.sub TO 'user_auth_id';

-- Try accessing data
SELECT * FROM public.franchises;

-- Reset role
RESET ROLE;
```

## Maintenance

### 1. Regular Checks
```sql
-- Check table sizes
SELECT 
  relname as table_name,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- Check indexes
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### 2. Backup
```bash
# Full backup
pg_dump "postgresql://postgres:[password]@localhost:54322/postgres" > backup.sql

# Restore
psql "postgresql://postgres:[password]@localhost:54322/postgres" < backup.sql
```

## Migration Scripts

All migration scripts are in `supabase/migrations/`:

1. `20250221_rebuild_database_step1_cleanup.sql` - Cleanup
2. `20250221_rebuild_database_step2_core_tables.sql` - Core tables
3. `20250221_rebuild_database_step3_functions.sql` - Functions
4. `20250221_rebuild_database_step4_policies.sql` - RLS policies
5. `20250221_rebuild_database_step5_default_data.sql` - Test data

## Additional Documentation

- [Database Overview](../DATABASE.md)
- [Implementation Details](DATABASE_IMPLEMENTATION.md)
- [Super Admin Guide](SUPER_ADMIN.md)

## Support

For issues:
1. Check logs in `supabase/migrations/logs/`
2. Run verification script: `20250221_verify_setup.sql`
3. Check error details in `pg_stat_activity`
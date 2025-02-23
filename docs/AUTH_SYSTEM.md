# Authentication System Documentation

## Overview
The authentication system implements a secure staff registration flow with role-based access control and proper permission management through Supabase.

## Key Components

### 1. Auth Flow
1. Staff email verification
2. Auth account creation
3. Staff record linking
4. Role assignment
5. Email confirmation

### 2. Database Structure
```sql
-- Core tables
auth.users          -- Supabase auth users
public.staff        -- Staff records
auth.identities     -- External identities

-- Key functions
verify_staff_registration  -- Checks staff eligibility
link_staff_account        -- Links staff to auth account
auth.bypass_rls           -- RLS bypass for service roles
```

### 3. Security Measures
- Row Level Security (RLS) policies
- Role-based permissions
- Auth service bypass
- Transaction safety
- Error handling

## Role Hierarchy

1. `supabase_auth_api`
   - Full access to auth schema
   - Bypasses RLS
   - Manages auth operations

2. `service_role`
   - Application level access
   - Can bypass RLS
   - Manages staff operations

3. `authenticated`
   - Read own auth record
   - Access own profile

4. `anon`
   - Create new accounts
   - Verify staff eligibility

## Common Issues & Solutions

### 1. Account Creation Fails
```sql
-- Check staff record exists
SELECT * FROM staff WHERE email = 'user@example.com';

-- Verify staff eligibility
SELECT * FROM verify_staff_registration('user@example.com');

-- Check auth user doesn't exist
SELECT * FROM auth.users WHERE email = 'user@example.com';
```

### 2. Permission Denied
```sql
-- Check role permissions
SELECT * FROM auth.auth_debug;

-- Verify policy is working
SELECT * FROM pg_policies 
WHERE schemaname = 'auth' 
AND tablename = 'users';
```

### 3. Staff Linking Fails
```sql
-- Check staff record
SELECT * FROM staff 
WHERE email = 'user@example.com' 
AND auth_id IS NULL;

-- Verify link attempt
SELECT * FROM link_staff_account(
  'user@example.com',
  'auth_user_id'
);
```

## Testing

1. Run verification script:
```sql
\i supabase/migrations/20250222025_verify_auth_system.sql
```

2. Manual testing steps:
   - Create staff record
   - Attempt account creation
   - Verify email confirmation
   - Test login
   - Check permissions

## Recovery Steps

1. If migrations fail:
```sql
-- Roll back to known good state
\i supabase/migrations/20250222023_final_auth_consolidation_down.sql
```

2. Clear problematic state:
```sql
-- Reset permissions
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA auth FROM PUBLIC;

-- Clean up policies
DROP POLICY IF EXISTS "unified_auth_policy" ON auth.users;

-- Reapply migrations
\i supabase/migrations/20250222023_final_auth_consolidation.sql
```

## Implementation Details

### RLS Policy
```sql
CREATE POLICY "unified_auth_policy" ON auth.users
AS PERMISSIVE FOR ALL
USING (
  auth.bypass_rls() OR
  CASE current_setting('request.path', TRUE)
    WHEN '/auth/v1/signup' THEN -- Allow verified staff signup
      EXISTS (SELECT 1 FROM staff WHERE ...)
    WHEN '/auth/v1/user' THEN -- Allow own record access
      auth.uid() = id
    ELSE false
  END
);
```

### Auth Service Bypass
The system uses a specialized role (`supabase_auth_api`) and function (`auth.bypass_rls()`) to allow the auth service to bypass RLS when needed.

### Transaction Safety
All critical operations (account creation, staff linking) are wrapped in transactions with proper error handling and rollback capabilities.

## Best Practices

1. Always verify staff eligibility before account creation
2. Use retries for auth operations
3. Maintain atomic transactions
4. Log all auth-related actions
5. Handle all error cases explicitly
6. Use proper role-based access
7. Keep RLS policies simple and clear

## Monitoring

1. Watch auth logs:
```sql
SELECT * FROM auth.audit_log_entries
ORDER BY created_at DESC
LIMIT 100;
```

2. Check permission status:
```sql
SELECT * FROM auth.auth_debug;
```

3. Monitor failed attempts:
```sql
SELECT * FROM auth.audit_log_entries
WHERE error IS NOT NULL
ORDER BY created_at DESC;

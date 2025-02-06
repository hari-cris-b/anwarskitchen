# Database Structure and Permissions System

## Tables

### profiles
```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    full_name TEXT NOT NULL,
    role TEXT CHECK (role IN ('staff', 'manager', 'admin')),
    franchise_id UUID REFERENCES franchises(id),
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    joining_date DATE,
    salary NUMERIC(10,2),
    shift TEXT CHECK (shift IN ('morning', 'evening', 'night')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### menu_items
```sql
CREATE TABLE menu_items (
    id UUID PRIMARY KEY,
    franchise_id UUID REFERENCES franchises(id),
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    category TEXT NOT NULL,
    tax_rate NUMERIC(4,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Materialized View for Permissions

To prevent infinite recursion in RLS policies, we use a materialized view that caches user permissions:

```sql
CREATE MATERIALIZED VIEW user_permissions AS
SELECT 
    p.id as user_id,
    p.franchise_id,
    p.role,
    p.is_active
FROM profiles p
WHERE p.is_active = true;
```

This view is automatically refreshed when profiles change:
```sql
CREATE TRIGGER refresh_user_permissions_trigger
    AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_user_permissions();
```

## Row Level Security (RLS) Policies

All policies now use the user_permissions materialized view instead of directly querying the profiles table. This prevents infinite recursion because the materialized view bypasses RLS.

### profiles Policies

1. **Select/Update/Insert**: Users can:
   - Access their own profile
   - If admin, access profiles in their franchise
   ```sql
   EXISTS (
       SELECT 1 FROM user_permissions up
       WHERE up.user_id = auth.uid()
       AND (
           up.user_id = profiles.id OR  -- Own profile
           (up.role = 'admin' AND up.franchise_id = profiles.franchise_id)  -- Admin access
       )
   )
   ```

### menu_items Policies

1. **Select**: Users can read menu items from their franchise
   ```sql
   EXISTS (
       SELECT 1 FROM user_permissions up
       WHERE up.user_id = auth.uid()
       AND up.franchise_id = menu_items.franchise_id
   )
   ```

2. **Insert/Update**: Admins and managers can modify menu items
   ```sql
   EXISTS (
       SELECT 1 FROM user_permissions up
       WHERE up.user_id = auth.uid()
       AND up.franchise_id = menu_items.franchise_id
       AND up.role IN ('admin', 'manager')
   )
   ```

## How It Works

1. The user_permissions materialized view provides a cached, RLS-bypassing lookup table
2. When profiles change, the view is automatically refreshed
3. All policies query the materialized view instead of the profiles table
4. This breaks the recursive chain that was causing infinite recursion
5. Performance is improved due to the materialized view's indexes

## Benefits

1. No recursive policy checks
2. Better performance through caching
3. Simplified policy logic
4. Automatic permission updates
5. Maintains security while avoiding recursion
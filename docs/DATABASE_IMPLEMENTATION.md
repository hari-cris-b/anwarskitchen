# Database Implementation Details

## Table Structures

### 1. franchises
```sql
CREATE TABLE public.franchises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  settings jsonb DEFAULT jsonb_build_object(
    'subscription_status', 'active',
    'max_staff_count', 50,
    'features_enabled', jsonb_build_array('pos', 'kitchen', 'reports')
  ),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 2. franchise_settings
```sql
CREATE TABLE public.franchise_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id uuid REFERENCES franchises(id) ON DELETE CASCADE,
  business_name varchar(255),
  tax_rate numeric DEFAULT 5.00,
  currency text DEFAULT 'INR',
  theme json DEFAULT '{"primaryColor": "#FFA500", "secondaryColor": "#FFD700"}',
  business_hours json,
  email varchar(255),
  phone varchar(255),
  address text,
  receipt_footer text,
  receipt_header text
);
```

### 3. staff
```sql
CREATE TABLE public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id uuid REFERENCES franchises(id) ON DELETE CASCADE,
  auth_id uuid REFERENCES auth.users(id),
  full_name text NOT NULL,
  email text UNIQUE,
  status status_type DEFAULT 'active',
  staff_type staff_role DEFAULT 'staff',
  pin_code char(4),
  permissions jsonb,
  email_verified boolean DEFAULT false
);
```

## Authentication Flow

1. Email Verification
```sql
CREATE FUNCTION verify_staff_email()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM staff WHERE email = NEW.email) THEN
    RAISE EXCEPTION 'Email not pre-registered by admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

2. Permission Check
```sql
CREATE FUNCTION check_staff_permissions(user_id uuid, required_permission text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM staff s
    WHERE s.auth_id = user_id
    AND (
      s.staff_type = 'admin' 
      OR (s.permissions->>required_permission)::boolean = true
    )
  );
END;
$$ LANGUAGE plpgsql;
```

## Row Level Security (RLS)

### Super Admin Access
```sql
CREATE POLICY "Super admin full access" ON [table_name]
FOR ALL USING (
  EXISTS (SELECT 1 FROM super_admin WHERE auth_id = auth.uid())
);
```

### Staff Access
```sql
CREATE POLICY "Staff franchise access" ON [table_name]
FOR SELECT USING (
  franchise_id IN (
    SELECT franchise_id 
    FROM user_franchise_access 
    WHERE auth_id = auth.uid()
  )
);
```

## Function Examples

### 1. Revenue Calculation
```sql
CREATE FUNCTION get_total_revenue_last_30_days()
RETURNS numeric AS $$
DECLARE
  v_total numeric;
BEGIN
  SELECT COALESCE(SUM(total), 0)
  INTO v_total
  FROM orders
  WHERE created_at >= NOW() - INTERVAL '30 days'
  AND status != 'cancelled';
  RETURN v_total;
END;
$$ LANGUAGE plpgsql;
```

### 2. Role Verification
```sql
CREATE FUNCTION check_super_admin(check_auth_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM super_admin WHERE auth_id = check_auth_id
  );
END;
$$ LANGUAGE plpgsql;
```

## Database Rebuild Process

1. Clean existing data:
   - Drop all tables
   - Remove custom types
   - Clear existing policies

2. Create core structure:
   - Create custom types
   - Create tables with constraints
   - Set up foreign keys

3. Implement security:
   - Enable RLS on all tables
   - Create access policies
   - Set up role permissions

4. Create test data:
   - Super admin account
   - Staff account
   - Test franchise

5. Verify setup:
   - Check table structures
   - Test RLS policies
   - Verify permissions
   - Test authentication

## Maintenance Notes

1. Backup Requirements:
   - Daily full backup
   - Hourly transaction logs
   - 30-day retention

2. Performance Considerations:
   - Indexes on frequently queried columns
   - Partitioning for large tables
   - Regular VACUUM and ANALYZE

3. Security Checks:
   - Regular policy audits
   - Permission verification
   - Activity log monitoring

## Common Operations

1. Add New Franchise:
```sql
INSERT INTO franchises (name, address)
VALUES ('Franchise Name', 'Address')
RETURNING id;
```

2. Register Staff:
```sql
INSERT INTO staff (
  franchise_id, 
  full_name, 
  email, 
  staff_type
)
VALUES (
  '[franchise_id]',
  'Staff Name',
  'staff@email.com',
  'staff'
);
```

3. Link Staff with Auth:
```sql
UPDATE staff
SET auth_id = '[auth_user_id]'
WHERE email = 'staff@email.com';
```

For more details on specific operations, refer to the migration scripts in `supabase/migrations/`.
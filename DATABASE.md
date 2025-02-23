# Database Documentation

## Schema Overview

This document outlines the database schema, including tables, relationships, policies, and function definitions.

## Tables

### Auth Schema Tables

#### 1. auth.audit_log_entries
```sql
CREATE TABLE auth.audit_log_entries (
  id uuid PRIMARY KEY,
  instance_id uuid,
  payload json,
  created_at timestamp with time zone,
  ip_address character varying
);
```

#### 2. auth.flow_state
```sql
CREATE TABLE auth.flow_state (
  id uuid PRIMARY KEY,
  user_id uuid,
  auth_code text,
  code_challenge_method auth.code_challenge_method,
  code_challenge text,
  provider_type text,
  provider_access_token text,
  provider_refresh_token text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  authentication_method text,
  auth_code_issued_at timestamp with time zone
);
```

#### 3. auth.identities
```sql
CREATE TABLE auth.identities (
  provider_id text,
  user_id uuid REFERENCES auth.users(id),
  identity_data jsonb,
  provider text,
  last_sign_in_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  email text,
  id uuid PRIMARY KEY
);
```

#### 4. auth.refresh_tokens
```sql
CREATE TABLE auth.refresh_tokens (
  instance_id uuid,
  id bigserial PRIMARY KEY,
  token character varying,
  user_id character varying,
  revoked boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  parent character varying,
  session_id uuid REFERENCES auth.sessions(id)
);
```

### Public Schema Tables

#### 1. franchises

Primary table storing franchise information.

```sql
CREATE TABLE public.franchises (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  settings jsonb DEFAULT jsonb_build_object(
    'subscription_status', 'active',
    'max_staff_count', 50,
    'features_enabled', jsonb_build_array('pos', 'kitchen', 'reports')
  ),
  CONSTRAINT franchises_pkey PRIMARY KEY (id)
);
```

### 2. franchise_settings

Stores configuration and business settings for each franchise.

```sql
CREATE TABLE public.franchise_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  franchise_id uuid NOT NULL,
  business_name character varying(255) NULL,
  tax_rate numeric NULL DEFAULT 5.00,
  currency text NULL DEFAULT 'INR'::text,
  theme json NULL DEFAULT '{"primaryColor": "#FFA500", "secondaryColor": "#FFD700"}'::json,
  business_hours json NULL DEFAULT '{"monday": {"open": "09:00", "close": "22:00"}}'::json,
  phone character varying(255) NULL,
  email character varying(255) NULL,
  address text NULL,
  gst_number character varying(255) NULL,
  receipt_footer text NULL,
  receipt_header text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT franchise_settings_pkey PRIMARY KEY (id),
  CONSTRAINT franchise_settings_franchise_id_fkey FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_franchise_settings ON public.franchise_settings USING btree (franchise_id);
```

### 3. menu_items

Stores menu items for each franchise.

```sql
CREATE TABLE public.menu_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  franchise_id uuid NOT NULL,
  name text NOT NULL,
  description text NULL,
  price numeric(10,2) NOT NULL,
  category text NOT NULL,
  image_url text NULL,
  is_available boolean NULL DEFAULT true,
  is_active boolean NULL DEFAULT true,
  tax_rate numeric NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT menu_items_pkey PRIMARY KEY (id),
  CONSTRAINT menu_items_franchise_id_fkey FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_menu_items_franchise ON public.menu_items USING btree (franchise_id);
```

### 4. orders

Stores customer orders and their details.

```sql
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  franchise_id uuid NOT NULL,
  table_number text NOT NULL,
  status public.order_status NULL DEFAULT 'pending'::order_status,
  customer_name text NULL,
  server_id uuid NULL,
  server_name text NULL,
  notes text NULL,
  subtotal numeric NULL,
  tax numeric NULL,
  discount numeric NULL,
  additional_charges numeric NULL,
  total numeric NULL,
  payment_status text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_franchise_id_fkey FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE,
  CONSTRAINT orders_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES staff(id)
);

CREATE INDEX IF NOT EXISTS idx_orders_franchise ON public.orders USING btree (franchise_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders USING btree (status);
```

### 5. order_items

Stores individual items within orders.

```sql
CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  menu_item_id uuid NOT NULL,
  quantity integer NOT NULL,
  price_at_time numeric(10,2) NOT NULL,
  notes text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES menu_items(id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items USING btree (order_id);
```

### 6. staff

Stores staff member information and permissions.

```sql
CREATE TABLE public.staff (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  franchise_id uuid NULL,
  auth_id uuid NULL,
  full_name text NOT NULL,
  email text NULL,
  status public.status_type NOT NULL DEFAULT 'active'::status_type,
  can_void_orders boolean NULL DEFAULT false,
  can_modify_menu boolean NULL DEFAULT false,
  can_manage_staff boolean NULL DEFAULT false,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  pin_code character(4) NULL,
  staff_type public.staff_role NOT NULL DEFAULT 'staff'::staff_role,
  permissions jsonb DEFAULT jsonb_build_object(
    'can_access_pos', true,
    'can_access_kitchen', true,
    'can_access_reports', false,
    'can_manage_menu', false,
    'can_manage_staff', false
  ),
  email_verified boolean DEFAULT false,
  phone text,
  shift text,
  hourly_rate text,
  joining_date text,
  CONSTRAINT staff_pkey PRIMARY KEY (id),
  CONSTRAINT staff_auth_id_key UNIQUE (auth_id),
  CONSTRAINT staff_email_key UNIQUE (email),
  CONSTRAINT staff_auth_id_fkey FOREIGN KEY (auth_id) REFERENCES auth.users(id),
  CONSTRAINT staff_franchise_id_fkey FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_staff_auth_id ON public.staff USING btree (auth_id);
CREATE UNIQUE INDEX IF NOT EXISTS staff_auth_franchise_unique ON public.staff USING btree (auth_id, COALESCE(franchise_id, '00000000-0000-0000-0000-000000000000'::uuid)) WHERE (staff_type <> 'super_admin'::staff_role);
```

### 7. staff_activity

Logs staff actions for auditing purposes.

```sql
CREATE TABLE staff_activity (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id),
  action_type text NOT NULL,
  action_details jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT staff_activity_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_staff_activity_staff_id ON staff_activity(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_activity_type ON staff_activity(action_type);
```

### 8. super_admin

Stores super administrator information.

```sql
CREATE TABLE public.super_admin (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  auth_id uuid NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT super_admin_pkey PRIMARY KEY (id),
  CONSTRAINT super_admin_auth_id_key UNIQUE (auth_id),
  CONSTRAINT super_admin_email_key UNIQUE (email),
  CONSTRAINT super_admin_auth_id_fkey FOREIGN KEY (auth_id) REFERENCES auth.users(id)
);
```

### 9. super_admin_activity

Logs super admin actions for auditing and monitoring purposes.

```sql
CREATE TABLE super_admin_activity (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  super_admin_id uuid REFERENCES super_admin(id),
  action_type text NOT NULL,
  action_details jsonb NOT NULL,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_super_admin_activity_admin_id ON super_admin_activity(super_admin_id);
CREATE INDEX IF NOT EXISTS idx_super_admin_activity_type ON super_admin_activity(action_type);
```

### 10. user_franchise_access

Manages user access rights to franchises.

```sql
CREATE TABLE public.user_franchise_access (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  auth_id uuid NOT NULL,
  franchise_id uuid NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  role public.staff_role NOT NULL DEFAULT 'staff'::staff_role,
  CONSTRAINT user_franchise_access_pkey PRIMARY KEY (id),
  CONSTRAINT user_franchise_access_auth_id_franchise_id_key UNIQUE (auth_id, franchise_id),
  CONSTRAINT user_franchise_access_auth_id_fkey FOREIGN KEY (auth_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT user_franchise_access_franchise_id_fkey FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_franchise_access ON public.user_franchise_access USING btree (auth_id, franchise_id);
```

## Functions

### 1. check_staff_permissions

Verifies if a staff member has specific permissions by checking their role type and permissions JSON field.

```sql
CREATE OR REPLACE FUNCTION check_staff_permissions(user_id uuid, required_permission text)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. verify_staff_pin

Validates staff PIN for POS access by checking PIN code, franchise association, and active status.

```sql
CREATE OR REPLACE FUNCTION verify_staff_pin(
  p_staff_id UUID,
  p_franchise_id UUID,
  p_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM staff
    WHERE id = p_staff_id
    AND franchise_id = p_franchise_id
    AND pin_code = p_pin
    AND status = 'active'
  );
END;
$$;
```

### 3. verify_staff_email

Ensures new user registrations use pre-approved staff emails by validating against existing staff records.

```sql
CREATE OR REPLACE FUNCTION verify_staff_email()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM staff WHERE email = NEW.email) THEN
    RAISE EXCEPTION 'Email not pre-registered by admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4. check_super_admin

Checks if a user has super admin privileges by verifying their existence in the super_admin table.

```sql
CREATE OR REPLACE FUNCTION check_super_admin(check_auth_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM super_admin
    WHERE auth_id = check_auth_id
  );
END;
$$;
```

### 5. link_super_admin_with_auth

Links an existing super admin with their auth user ID, required for system access. Includes validation and proper error handling.

```sql
CREATE OR REPLACE FUNCTION link_super_admin_with_auth(
  p_email text,
  p_auth_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_super_admin_id uuid;
BEGIN
  -- Get super admin id
  SELECT id INTO v_super_admin_id
  FROM super_admin
  WHERE email = p_email
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Super admin with email % not found', p_email;
  END IF;

  -- Update auth_id
  UPDATE super_admin
  SET auth_id = p_auth_id,
      updated_at = now()
  WHERE id = v_super_admin_id;

  RETURN v_super_admin_id;
END;
$$;
```

### 6. ensure_super_admin

Ensures a super admin exists in the system with given email, creating one if not found.

```sql
CREATE OR REPLACE FUNCTION ensure_super_admin(
  p_email text DEFAULT 'admin@ak.com',
  p_full_name text DEFAULT 'System Administrator'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_super_admin_id uuid;
BEGIN
  -- Check if super admin exists
  SELECT id INTO v_super_admin_id
  FROM super_admin
  WHERE email = p_email;

  -- If not exists, create one
  IF NOT FOUND THEN
    INSERT INTO super_admin (
      email,
      full_name
    ) VALUES (
      p_email,
      p_full_name
    )
    RETURNING id INTO v_super_admin_id;
  END IF;

  RETURN v_super_admin_id;
END;
$$;
```

### 7. add_super_admin

Adds a new super admin to the system, with security checks to ensure only existing super admins can add new ones.

```sql
CREATE OR REPLACE FUNCTION add_super_admin(
  p_email text,
  p_full_name text,
  p_auth_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_super_admin_id uuid;
BEGIN
  -- Check if caller is super admin
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can add other super admins';
  END IF;

  -- Insert new super admin
  INSERT INTO super_admin (
    email,
    full_name,
    auth_id
  ) VALUES (
    p_email,
    p_full_name,
    p_auth_id
  )
  RETURNING id INTO v_super_admin_id;

  RETURN v_super_admin_id;
END;
$$;
```

### 8. get_user_role

Retrieves user role information with proper role hierarchy checking.

```sql
CREATE OR REPLACE FUNCTION get_user_role(check_auth_id uuid)
RETURNS TABLE (
  role_type text,
  id uuid,
  is_super_admin boolean
) AS $$
BEGIN
  -- First check super admin
  IF EXISTS (SELECT 1 FROM super_admin WHERE auth_id = check_auth_id) THEN
    RETURN QUERY
    SELECT
      'super_admin'::text,
      sa.id,
      true
    FROM super_admin sa
    WHERE sa.auth_id = check_auth_id;
    RETURN;
  END IF;

  -- Then check staff
  RETURN QUERY
  SELECT
    s.staff_type::text,
    s.id,
    false
  FROM staff s
  WHERE s.auth_id = check_auth_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 9. prevent_role_conflict

Prevents users from having multiple roles in the system by enforcing role exclusivity.

```sql
CREATE OR REPLACE FUNCTION prevent_role_conflict()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.auth_id != OLD.auth_id THEN
    IF EXISTS (
      SELECT 1 FROM get_user_role(NEW.auth_id)
      WHERE role_type IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'User already has a role in the system';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 10. get_total_revenue_last_30_days

Returns the total revenue from completed orders within the last 30 days. Only accessible to super admin users.

```sql
CREATE OR REPLACE FUNCTION public.get_total_revenue_last_30_days()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric;
  v_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Check if user has super admin role
  IF NOT EXISTS (
    SELECT 1 FROM public.super_admin
    WHERE auth_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  -- Get total revenue with proper handling of nulls
  SELECT COALESCE(SUM(COALESCE(total, 0)), 0)
  INTO v_total
  FROM public.orders o
  WHERE
    o.created_at >= NOW() - INTERVAL '30 days'
    AND o.status NOT IN ('cancelled');

  RETURN v_total;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error details
    RAISE WARNING 'Error in get_total_revenue_last_30_days: %', SQLERRM;
    -- Return 0 instead of failing
    RETURN 0;
END;
$$;
```

### 11. get_orders_with_items

Retrieves orders with their associated menu items in a structured JSON format. This function:
- Joins orders with their items and menu details
- Returns a paginated list of orders
- Includes full menu item details for each order
- Maintains proper ordering of items within each order
- Handles null values and empty orders gracefully

```sql
CREATE OR REPLACE FUNCTION get_orders_with_items(
  p_franchise_id UUID,
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  franchise_id UUID,
  table_number TEXT,
  status TEXT,
  customer_name TEXT,
  server_id UUID,
  server_name TEXT,
  notes TEXT,
  subtotal NUMERIC,
  tax NUMERIC,
  discount NUMERIC,
  additional_charges NUMERIC,
  total NUMERIC,
  payment_status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  order_items JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.franchise_id,
    o.table_number,
    o.status::TEXT,
    o.customer_name,
    o.server_id,
    o.server_name,
    o.notes,
    o.subtotal,
    o.tax,
    o.discount,
    o.additional_charges,
    o.total,
    o.payment_status,
    o.created_at,
    o.updated_at,
    COALESCE(
      (
        WITH ordered_items AS (
          SELECT
            oi.id AS order_item_id,
            oi.order_id,
            oi.menu_item_id AS item_menu_ref,
            oi.quantity,
            oi.price_at_time,
            oi.notes AS item_notes,
            oi.created_at AS item_created_at,
            mi.id AS menu_item_id,
            mi.franchise_id AS menu_item_franchise_id,
            mi.name AS menu_item_name,
            mi.description AS menu_item_description,
            mi.price AS menu_item_price,
            mi.category AS menu_item_category,
            mi.tax_rate AS menu_item_tax_rate,
            mi.image_url AS menu_item_image_url,
            mi.is_available AS menu_item_is_available,
            mi.is_active AS menu_item_is_active,
            mi.created_at AS menu_item_created_at,
            mi.updated_at AS menu_item_updated_at,
            ROW_NUMBER() OVER (PARTITION BY oi.order_id ORDER BY oi.created_at ASC) as rn
          FROM order_items oi
          JOIN menu_items mi ON mi.id = oi.menu_item_id
          WHERE oi.order_id = o.id
        )
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', order_item_id,
            'order_id', order_id,
            'menu_item_id', item_menu_ref,
            'quantity', quantity,
            'price_at_time', price_at_time,
            'notes', item_notes,
            'created_at', item_created_at,
            'menu_items', jsonb_build_object(
              'id', menu_item_id,
              'franchise_id', menu_item_franchise_id,
              'name', menu_item_name,
              'description', menu_item_description,
              'price', menu_item_price,
              'category', menu_item_category,
              'tax_rate', menu_item_tax_rate,
              'image_url', menu_item_image_url,
              'is_available', menu_item_is_available,
              'is_active', menu_item_is_active,
              'created_at', menu_item_created_at,
              'updated_at', menu_item_updated_at
            )
          ) ORDER BY rn
        )
        FROM ordered_items
      ),
      '[]'::jsonb
    ) as order_items
  FROM orders o
  WHERE o.franchise_id = p_franchise_id
  ORDER BY o.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
```

## Row-Level Security (RLS) Policies

### franchises
```sql
CREATE POLICY select_franchises ON public.franchises
FOR SELECT
USING (id IN (SELECT franchise_id FROM public.user_franchise_access WHERE auth_id = (select auth.uid())));
```

### franchise_settings
```sql
CREATE POLICY select_franchise_settings ON public.franchise_settings
FOR SELECT
USING (franchise_id IN (SELECT franchise_id FROM public.user_franchise_access WHERE auth_id = (select auth.uid())));
```

### menu_items
```sql
CREATE POLICY select_menu_items ON public.menu_items
FOR SELECT
USING (franchise_id IN (SELECT franchise_id FROM public.user_franchise_access WHERE auth_id = (select auth.uid())));
```

### orders
```sql
CREATE POLICY select_orders ON public.orders
FOR SELECT
USING (franchise_id IN (SELECT franchise_id FROM public.user_franchise_access WHERE auth_id = (select auth.uid())));
```

### order_items
```sql
CREATE POLICY select_order_items ON public.order_items
FOR SELECT
USING (order_id IN (SELECT id FROM public.orders WHERE franchise_id IN (SELECT franchise_id FROM public.user_franchise_access WHERE auth_id = (select auth.uid()))));
```

### staff
```sql
CREATE POLICY select_staff ON public.staff
FOR SELECT
USING (franchise_id IN (SELECT franchise_id FROM public.user_franchise_access WHERE auth_id = (select auth.uid())));
```

### staff_activity
```sql
CREATE POLICY select_staff_activity ON public.staff_activity
FOR SELECT
USING (staff_id IN (SELECT id FROM public.staff WHERE franchise_id IN (SELECT franchise_id FROM public.user_franchise_access WHERE auth_id = (select auth.uid()))));
```

### super_admin
```sql
CREATE POLICY select_super_admin ON public.super_admin
FOR SELECT
USING (auth_id = (select auth.uid()));
```

### user_franchise_access
```sql
CREATE POLICY select_user_franchise_access ON public.user_franchise_access
FOR SELECT
USING (auth_id = (select auth.uid()));
```

## Roles and Permissions

1. **Super Admin**
   - Full access to all franchises data
   - Can manage franchise settings and subscriptions
   - Can view and manage all staff across franchises

2. **Admin**
   - Full access within their assigned franchise
   - Can manage staff (add, edit, view PINs)
   - Can manage menu and settings
   - Can access all reports

3. **Manager**
   - Access to POS, orders, kitchen, and menu
   - Can view reports
   - Cannot manage staff or franchise settings

4. **Kitchen Staff**
   - Access to POS, orders, and kitchen interface
   - Cannot access management features
   - Cannot modify menu or settings

5. **Staff**
   - Access to POS and order, and kitchen interface
   - Cannot access management features
   - Cannot modify menu or settings

## Account Creation Flow

1. Admin adds staff member in staff management
2. System marks email as verified in staff table
3. Staff member can create account using pre-registered email
4. System validates email against staff table
5. Account is created with appropriate permissions

## PIN System

- All staff members can have a 4-digit PIN for POS access
- PINs are stored in staff table as varchar(4)
- Used for quick authentication in POS system
- PIN verification is handled through verify_staff_pin function
- Verification checks include:
  * Valid staff ID and franchise ID
  * Correct PIN match
  * Active staff status
- Only admins can set and modify PINs
- Row-level security ensures PINs can only be accessed by authorized staff

## Activity Tracking

Both staff and super admin activities are logged in their respective activity tables:

### Staff Activity
- Logged in staff_activity table
- Includes action type and detailed information
- Used for audit trails and monitoring
- Actions like order creation, menu updates, etc.

### Super Admin Activity
- Logged in super_admin_activity table
- Includes IP address for security
- Tracks system-level operations
- More detailed logging for sensitive operations

## Super Admin Management

### Overview
- Super admins have top-level system access
- Can manage all franchises, settings and their  Revenue datas  
- Access controlled through dedicated super_admin table
- Special functions for privileged operations

### Role Management

#### 1. Role Exclusivity
Database enforces strict separation between super admins and staff:

```sql
-- Handles role conflicts with detailed error messages
CREATE TRIGGER check_role_conflict_super_admin
  BEFORE INSERT OR UPDATE ON super_admin
  FOR EACH ROW
  EXECUTE FUNCTION handle_role_conflict();

CREATE TRIGGER check_role_conflict_staff
  BEFORE INSERT OR UPDATE ON staff
  FOR EACH ROW
  EXECUTE FUNCTION handle_role_conflict();
```

Validation includes:
- Prevents dual role assignments
- Detailed error messages for role conflicts
- Optimized role checking with indexes
- Real-time validation during updates

#### 2. Account Maintenance
Automatic cleanup and maintenance:

```sql
-- Cleanup unlinked super admin accounts
SELECT cron.schedule(
  'cleanup-unlinked-super-admins',
  '0 0 * * *', -- Run at midnight every day
  'SELECT cleanup_unlinked_super_admins()'
);
```

Features:
- Daily cleanup of unlinked accounts (24h threshold)
- Automatic removal of stale records
- Optimized database performance
- Audit trail of cleanup actions

### Auth ID Management
- Initial super admin is created without auth_id
- One-time auth_id linking process:
  ```sql
  -- First ensure super admin exists
  SELECT ensure_super_admin('admin@ak.com', 'System Administrator');
  
  -- Then link with auth system after user creation
  SELECT link_super_admin_with_auth('admin@ak.com', '[auth_user_id]');
  ```
- Protections:
  * Auth ID can only be set once
  * Trigger prevents modification after set
  * Only super admin email owner can link
  * Auto-cleanup of unlinked accounts

### Access Control
```sql
-- Super admin table policies
CREATE POLICY "Super admins can view all super admin records"
ON public.super_admin FOR SELECT
USING (check_super_admin(auth.uid()));

CREATE POLICY "Super admins can add new super admins"
ON public.super_admin FOR INSERT
WITH CHECK (check_super_admin(auth.uid()));

CREATE POLICY "Super admins can update super admin records"
ON public.super_admin FOR UPDATE
USING (check_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete super admin records"
ON public.super_admin FOR DELETE
USING (check_super_admin(auth.uid()));

-- Super admin bypass for franchise access
CREATE POLICY "Super admins can access all franchises"
ON public.franchises FOR ALL
USING (is_super_admin(auth.uid()));
```

### Performance Optimizations
- Dedicated indexes for super admin lookups:
  ```sql
  CREATE INDEX idx_super_admin_auth_id ON super_admin(auth_id);
  CREATE INDEX idx_super_admin_email ON super_admin(email);
  ```
- Efficient cross-franchise query patterns:
  * Uses materialized paths for hierarchy traversal
  * Implements query result caching
  * Optimizes join order for multi-franchise operations
- Authentication optimizations:
  * Fast-path super admin checks
  * Cached permission lookups
  * Efficient RLS policy evaluation

## Notes

- All tables have appropriate indexes for performance
- Foreign key constraints maintain data integrity
- Row Level Security (RLS) policies protect data access
- Email verification ensures secure account creation
- PIN system provides quick POS authentication
- Activity logging enables audit trails
- Order retrieval optimized using JSON aggregation and window functions
- Efficient data loading with proper column aliasing and type casting
- Query performance enhanced with specialized indexes for common operations
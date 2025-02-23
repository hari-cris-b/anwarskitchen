# Database Rebuild Plan

## 1. Cleanup Phase

1. Drop existing tables in reverse order of dependencies:
```sql
DROP TABLE IF EXISTS public.super_admin_activity;
DROP TABLE IF EXISTS public.staff_activity;
DROP TABLE IF EXISTS public.user_franchise_access;
DROP TABLE IF EXISTS public.order_items;
DROP TABLE IF EXISTS public.orders;  
DROP TABLE IF EXISTS public.menu_items;
DROP TABLE IF EXISTS public.franchise_settings;
DROP TABLE IF EXISTS public.staff;
DROP TABLE IF EXISTS public.super_admin;
DROP TABLE IF EXISTS public.franchises;
```

2. Drop existing types and enums:
```sql
DROP TYPE IF EXISTS public.staff_role;
DROP TYPE IF EXISTS public.status_type;
DROP TYPE IF EXISTS public.order_status;
```

## 2. Create Types and Enums

```sql
CREATE TYPE public.staff_role AS ENUM ('staff', 'kitchen', 'manager', 'admin', 'super_admin');
CREATE TYPE public.status_type AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE public.order_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
```

## 3. Create Tables

### Core Tables

1. Create franchises table
2. Create franchise_settings table
3. Create menu_items table
4. Create super_admin table
5. Create staff table
6. Create orders and order_items tables
7. Create activity tracking tables
8. Create user_franchise_access table

### Initial Data Setup

1. Create default super admin:
```sql
-- First ensure super admin exists
SELECT ensure_super_admin('harikrish120027@gmail.com', 'Super Admin');

-- Then link with auth system
SELECT link_super_admin_with_auth('harikrish120027@gmail.com', '[auth_user_id]');
```

2. Create default staff:
```sql
INSERT INTO staff (
  email,
  full_name,
  staff_type,
  email_verified
) VALUES (
  'haricrisb@gmail.com',
  'Staff User',
  'staff',
  true
);
```

## 4. Security Implementation

1. Row Level Security (RLS) policies for each table
2. Function-based access control
3. Role-based permissions
4. Activity logging triggers

## 5. Functions

1. `check_staff_permissions`
2. `verify_staff_pin`
3. `verify_staff_email`  
4. `check_super_admin`
5. `link_super_admin_with_auth`
6. `ensure_super_admin`
7. `add_super_admin`
8. `get_user_role`
9. `prevent_role_conflict`
10. `get_total_revenue_last_30_days`
11. `get_orders_with_items`

## 6. Validation & Testing

1. Test super admin access:
   - Login
   - Cross-franchise access
   - Management capabilities

2. Test staff access:
   - Role-based permissions
   - Franchise-specific access
   - Feature restrictions

## Implementation Order

1. Core Tables & Types
2. Security Policies
3. Helper Functions  
4. Default Users
5. Access Control
6. Testing & Validation

## Notes

- Maintain all indexes for performance
- Preserve existing constraints and relationships
- Ensure proper cascading deletes
- Verify email verification flow
- Test PIN system thoroughly
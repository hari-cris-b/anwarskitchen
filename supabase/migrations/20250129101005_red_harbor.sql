/*
  # Restaurant POS Initial Schema

  1. New Tables
    - `franchises`
      - Basic franchise information
    - `menu_items`
      - Restaurant menu items shared across franchises
    - `orders`
      - Customer orders and transactions
    - `order_items`
      - Individual items in each order
    - `users`
      - System users (staff, managers, admin)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Franchises table
CREATE TABLE IF NOT EXISTS franchises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Menu items table
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  category text NOT NULL,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id uuid REFERENCES franchises(id),
  total_amount decimal(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_method text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
  menu_item_id uuid REFERENCES menu_items(id),
  quantity integer NOT NULL,
  unit_price decimal(10,2) NOT NULL,
  subtotal decimal(10,2) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Users profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  full_name text,
  franchise_id uuid REFERENCES franchises(id),
  role text NOT NULL DEFAULT 'staff',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE franchises ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Staff can view their franchise" ON franchises
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT franchise_id FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admin can view all franchises" ON franchises
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Everyone can view menu items" ON menu_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage menu items" ON menu_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Staff can view their franchise orders" ON orders
  FOR SELECT TO authenticated
  USING (
    franchise_id IN (
      SELECT franchise_id FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Staff can create orders for their franchise" ON orders
  FOR INSERT TO authenticated
  WITH CHECK (
    franchise_id IN (
      SELECT franchise_id FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Staff can view their order items" ON order_items
  FOR SELECT TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders WHERE franchise_id IN (
        SELECT franchise_id FROM profiles 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Staff can manage their profile" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());
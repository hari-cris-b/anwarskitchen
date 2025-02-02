-- Drop existing tables if they exist
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS franchise_settings;

-- Create franchise_settings table
CREATE TABLE IF NOT EXISTS franchise_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add RLS policies for franchise_settings
ALTER TABLE franchise_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY franchise_settings_access ON franchise_settings
    FOR ALL
    TO authenticated
    USING (id = (SELECT franchise_id FROM profiles WHERE id = auth.uid()))
    WITH CHECK (id = (SELECT franchise_id FROM profiles WHERE id = auth.uid()));

-- Create orders table with all required fields including adjustments
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    franchise_id UUID NOT NULL REFERENCES franchises(id),
    table_number VARCHAR(50) NOT NULL,
    server_id UUID NOT NULL,
    server_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
    payment_method VARCHAR(50),
    subtotal DECIMAL(10,2) NOT NULL,
    tax DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    additional_charges DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create order items table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL,
    category VARCHAR(100),
    tax_rate DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_franchise_id ON orders(franchise_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Add table comments
COMMENT ON TABLE orders IS 'Stores all order information including payment details and adjustments';
COMMENT ON TABLE order_items IS 'Stores individual items within each order';
COMMENT ON TABLE franchise_settings IS 'Stores settings for each franchise';

-- Add column comments for the adjustment fields
COMMENT ON COLUMN orders.discount IS 'The discount amount applied to the order';
COMMENT ON COLUMN orders.additional_charges IS 'Any additional charges applied to the order';

-- Add RLS policies
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Create policies for orders
CREATE POLICY orders_franchise_access ON orders
    FOR ALL
    TO authenticated
    USING (franchise_id = (SELECT franchise_id FROM profiles WHERE id = auth.uid()))
    WITH CHECK (franchise_id = (SELECT franchise_id FROM profiles WHERE id = auth.uid()));

-- Create policies for order items
CREATE POLICY order_items_franchise_access ON order_items
    FOR ALL
    TO authenticated
    USING (order_id IN (SELECT id FROM orders WHERE franchise_id = (SELECT franchise_id FROM profiles WHERE id = auth.uid())))
    WITH CHECK (order_id IN (SELECT id FROM orders WHERE franchise_id = (SELECT franchise_id FROM profiles WHERE id = auth.uid())));

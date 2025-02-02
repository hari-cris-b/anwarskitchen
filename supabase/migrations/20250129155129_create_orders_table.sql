-- Update orders table if needed
DO $$ 
BEGIN
    -- Add new columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'cgst') THEN
        ALTER TABLE orders ADD COLUMN cgst DECIMAL(10,2) NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'sgst') THEN
        ALTER TABLE orders ADD COLUMN sgst DECIMAL(10,2) NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'additional_charges') THEN
        ALTER TABLE orders ADD COLUMN additional_charges DECIMAL(10,2) NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'discount') THEN
        ALTER TABLE orders ADD COLUMN discount DECIMAL(10,2) NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'roundoff') THEN
        ALTER TABLE orders ADD COLUMN roundoff DECIMAL(10,2) NOT NULL DEFAULT 0;
    END IF;

    -- Update status check constraint if needed
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
    ALTER TABLE orders ADD CONSTRAINT orders_status_check 
        CHECK (status IN ('pending', 'preparing', 'ready', 'completed'));
END $$;

-- Enable Row Level Security if not already enabled
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Staff can view all orders" ON orders;
DROP POLICY IF EXISTS "Staff can create orders" ON orders;
DROP POLICY IF EXISTS "Staff can update orders" ON orders;
DROP POLICY IF EXISTS "Managers and admins can delete orders" ON orders;

-- Create or update policies
-- Staff can view all orders
CREATE POLICY "Staff can view all orders"
    ON orders FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'staff' OR profiles.role = 'manager' OR profiles.role = 'admin')
        )
    );

-- Staff can create orders
CREATE POLICY "Staff can create orders"
    ON orders FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'staff' OR profiles.role = 'manager' OR profiles.role = 'admin')
        )
    );

-- Staff can update orders
CREATE POLICY "Staff can update orders"
    ON orders FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'staff' OR profiles.role = 'manager' OR profiles.role = 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'staff' OR profiles.role = 'manager' OR profiles.role = 'admin')
        )
    );

-- Only managers and admins can delete orders
CREATE POLICY "Managers and admins can delete orders"
    ON orders FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'manager' OR profiles.role = 'admin')
        )
    );
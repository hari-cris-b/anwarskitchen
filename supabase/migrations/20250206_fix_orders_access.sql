-- Create a secure function for accessing orders
CREATE OR REPLACE FUNCTION get_franchise_orders(franchise_id_param UUID)
RETURNS TABLE (
    id UUID,
    table_number TEXT,
    server_id UUID,
    server_name TEXT,
    franchise_id UUID,
    status TEXT,
    payment_status TEXT,
    payment_method TEXT,
    subtotal NUMERIC,
    tax NUMERIC,
    total NUMERIC,
    discount NUMERIC,
    additional_charges NUMERIC,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    pending_at TIMESTAMPTZ,
    preparing_at TIMESTAMPTZ,
    ready_at TIMESTAMPTZ,
    served_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    items JSON -- Include nested order items
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Get the requesting user's franchise_id
    DECLARE 
        v_user_franchise_id UUID;
    BEGIN
        SELECT franchise_id INTO v_user_franchise_id
        FROM profiles
        WHERE id = auth.uid();

        -- Only return orders if user belongs to the requested franchise
        IF v_user_franchise_id = franchise_id_param THEN
            RETURN QUERY
            SELECT 
                o.*,
                COALESCE(
                    (
                        SELECT json_agg(oi.*)
                        FROM order_items oi
                        WHERE oi.order_id = o.id
                    ),
                    '[]'::json
                ) as items
            FROM orders o
            WHERE o.franchise_id = franchise_id_param
            ORDER BY o.created_at DESC;
        END IF;
    END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_franchise_orders TO authenticated;

-- Enable RLS on orders and order_items tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Create policies for orders table
CREATE POLICY "orders_access_franchise" ON orders
    FOR ALL
    TO authenticated
    USING (
        franchise_id = (
            SELECT p.franchise_id 
            FROM profiles p
            WHERE p.id = auth.uid()
            LIMIT 1
        )
    );

-- Create policies for order_items table (they inherit the parent order's permissions)
CREATE POLICY "order_items_access_franchise" ON order_items
    FOR ALL
    TO authenticated
    USING (
        order_id IN (
            SELECT o.id 
            FROM orders o
            WHERE o.franchise_id = (
                SELECT p.franchise_id 
                FROM profiles p
                WHERE p.id = auth.uid()
                LIMIT 1
            )
        )
    );
-- Function to get order stats for a specific franchise and date
CREATE OR REPLACE FUNCTION get_order_stats(p_franchise_id UUID, p_date DATE)
RETURNS TABLE (
    total_orders BIGINT,
    pending_orders BIGINT,
    preparing_orders BIGINT,
    ready_orders BIGINT,
    completed_orders BIGINT,
    total_sales NUMERIC,
    average_order_value NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_orders,
        COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_orders,
        COUNT(*) FILTER (WHERE status = 'preparing')::BIGINT as preparing_orders,
        COUNT(*) FILTER (WHERE status = 'ready')::BIGINT as ready_orders,
        COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_orders,
        COALESCE(SUM(total), 0) as total_sales,
        COALESCE(AVG(total), 0) as average_order_value
    FROM orders
    WHERE franchise_id = p_franchise_id
    AND DATE(created_at) = p_date;
END;
$$ LANGUAGE plpgsql;

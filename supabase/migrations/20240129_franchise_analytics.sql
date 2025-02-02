-- Create function to get franchise analytics
CREATE OR REPLACE FUNCTION get_franchise_analytics(p_franchise_id INT, p_period TEXT)
RETURNS TABLE (
  period_start DATE,
  total_orders BIGINT,
  total_sales NUMERIC,
  total_tax NUMERIC,
  average_order_value NUMERIC,
  top_selling_items JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH sales_data AS (
    SELECT
      CASE
        WHEN p_period = 'day' THEN date_trunc('day', o.created_at)::DATE
        WHEN p_period = 'week' THEN date_trunc('week', o.created_at)::DATE
        WHEN p_period = 'month' THEN date_trunc('month', o.created_at)::DATE
        ELSE date_trunc('year', o.created_at)::DATE
      END AS period_start,
      COUNT(*) as order_count,
      SUM(o.total) as sales,
      SUM(o.cgst + o.sgst) as tax,
      SUM(o.total) / COUNT(*) as avg_order,
      jsonb_agg(
        DISTINCT jsonb_build_object(
          'item_name', i.name,
          'quantity', i.quantity,
          'total_sales', i.quantity * i.price
        )
        ORDER BY i.quantity DESC
      ) FILTER (WHERE i.name IS NOT NULL) as items
    FROM orders o
    LEFT JOIN LATERAL jsonb_to_recordset(o.items) AS i(name text, quantity int, price numeric)
      ON true
    WHERE o.franchise_id = p_franchise_id
    AND o.created_at >= CASE
      WHEN p_period = 'day' THEN NOW() - INTERVAL '1 day'
      WHEN p_period = 'week' THEN NOW() - INTERVAL '1 week'
      WHEN p_period = 'month' THEN NOW() - INTERVAL '1 month'
      ELSE NOW() - INTERVAL '1 year'
    END
    GROUP BY 1
  )
  SELECT
    period_start,
    order_count,
    sales,
    tax,
    avg_order,
    COALESCE(items, '[]'::jsonb)
  FROM sales_data
  ORDER BY period_start DESC;
END;
$$;

-- Create function to get top performing franchises
CREATE OR REPLACE FUNCTION get_top_performing_franchises(p_limit INT DEFAULT 5)
RETURNS TABLE (
  franchise_id INT,
  franchise_name TEXT,
  total_orders BIGINT,
  total_sales NUMERIC,
  average_order_value NUMERIC,
  growth_rate NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH current_period AS (
    SELECT
      f.id as franchise_id,
      f.name as franchise_name,
      COUNT(o.id) as orders,
      COALESCE(SUM(o.total), 0) as sales
    FROM franchises f
    LEFT JOIN orders o ON f.id = o.franchise_id
      AND o.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY f.id, f.name
  ),
  previous_period AS (
    SELECT
      f.id as franchise_id,
      COALESCE(SUM(o.total), 0) as previous_sales
    FROM franchises f
    LEFT JOIN orders o ON f.id = o.franchise_id
      AND o.created_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days'
    GROUP BY f.id
  )
  SELECT
    cp.franchise_id,
    cp.franchise_name,
    cp.orders as total_orders,
    cp.sales as total_sales,
    CASE WHEN cp.orders > 0 THEN cp.sales / cp.orders ELSE 0 END as average_order_value,
    CASE
      WHEN pp.previous_sales > 0 THEN
        ((cp.sales - pp.previous_sales) / pp.previous_sales * 100)
      ELSE 0
    END as growth_rate
  FROM current_period cp
  LEFT JOIN previous_period pp ON cp.franchise_id = pp.franchise_id
  ORDER BY cp.sales DESC
  LIMIT p_limit;
END;
$$;

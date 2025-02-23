-- Functions for super admin operations and dashboard metrics

-- Function to get all franchise metrics
CREATE OR REPLACE FUNCTION get_franchise_metrics(
  start_date timestamp DEFAULT (now() - interval '30 days'),
  end_date timestamp DEFAULT now()
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  -- Only super admins can access this function
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can access franchise metrics';
  END IF;

  WITH franchise_stats AS (
    SELECT 
      f.id AS franchise_id,
      f.name AS franchise_name,
      COUNT(DISTINCT o.id) AS total_orders,
      COALESCE(SUM(o.total), 0) AS total_revenue,
      COUNT(DISTINCT s.id) AS total_staff,
      COUNT(DISTINCT mi.id) AS total_menu_items,
      (
        SELECT COUNT(*)
        FROM public.orders po
        WHERE po.franchise_id = f.id
        AND po.status = 'pending'
        AND po.created_at >= start_date
        AND po.created_at <= end_date
      ) AS pending_orders
    FROM public.franchises f
    LEFT JOIN public.orders o ON o.franchise_id = f.id
      AND o.created_at >= start_date
      AND o.created_at <= end_date
    LEFT JOIN public.staff s ON s.franchise_id = f.id
    LEFT JOIN public.menu_items mi ON mi.franchise_id = f.id
    GROUP BY f.id, f.name
  )
  SELECT jsonb_build_object(
    'total_franchises', COUNT(*),
    'total_revenue', SUM(total_revenue),
    'total_orders', SUM(total_orders),
    'total_staff', SUM(total_staff),
    'franchise_details', jsonb_agg(
      jsonb_build_object(
        'id', franchise_id,
        'name', franchise_name,
        'revenue', total_revenue,
        'orders', total_orders,
        'staff_count', total_staff,
        'menu_items', total_menu_items,
        'pending_orders', pending_orders
      )
    )
  )
  INTO result
  FROM franchise_stats;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get top performing franchises
CREATE OR REPLACE FUNCTION get_top_performing_franchises(
  limit_count integer DEFAULT 5,
  start_date timestamp DEFAULT (now() - interval '30 days'),
  end_date timestamp DEFAULT now()
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  -- Only super admins can access this function
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can access performance metrics';
  END IF;

  WITH franchise_performance AS (
    SELECT 
      f.id,
      f.name,
      COUNT(DISTINCT o.id) as order_count,
      COALESCE(SUM(o.total), 0) as revenue,
      COUNT(DISTINCT o.id)::float / 
        EXTRACT(EPOCH FROM (end_date - start_date)) * 86400 as orders_per_day,
      COALESCE(SUM(o.total), 0)::float / 
        GREATEST(COUNT(DISTINCT o.id), 1) as average_order_value
    FROM public.franchises f
    LEFT JOIN public.orders o ON o.franchise_id = f.id
      AND o.created_at >= start_date
      AND o.created_at <= end_date
    GROUP BY f.id, f.name
    ORDER BY revenue DESC
    LIMIT limit_count
  )
  SELECT jsonb_build_object(
    'period_start', start_date,
    'period_end', end_date,
    'franchises', jsonb_agg(
      jsonb_build_object(
        'id', id,
        'name', name,
        'revenue', revenue,
        'order_count', order_count,
        'orders_per_day', ROUND(orders_per_day::numeric, 2),
        'average_order_value', ROUND(average_order_value::numeric, 2)
      )
    )
  )
  INTO result
  FROM franchise_performance;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get revenue trends
CREATE OR REPLACE FUNCTION get_revenue_trends(
  franchise_id_input uuid DEFAULT NULL,
  interval_type text DEFAULT 'daily',
  start_date timestamp DEFAULT (now() - interval '30 days'),
  end_date timestamp DEFAULT now()
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  interval_format text;
BEGIN
  -- Only super admins can access this function
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can access revenue trends';
  END IF;

  -- Set interval format based on type
  interval_format := CASE interval_type
    WHEN 'hourly' THEN 'YYYY-MM-DD HH24:00'
    WHEN 'daily' THEN 'YYYY-MM-DD'
    WHEN 'weekly' THEN 'IYYY-IW'
    WHEN 'monthly' THEN 'YYYY-MM'
    ELSE 'YYYY-MM-DD'
  END;

  WITH revenue_data AS (
    SELECT 
      to_char(o.created_at, interval_format) AS period,
      COALESCE(SUM(o.total), 0) as revenue,
      COUNT(DISTINCT o.id) as order_count
    FROM public.orders o
    WHERE o.created_at >= start_date
      AND o.created_at <= end_date
      AND (franchise_id_input IS NULL OR o.franchise_id = franchise_id_input)
    GROUP BY period
    ORDER BY period
  )
  SELECT jsonb_build_object(
    'interval', interval_type,
    'start_date', start_date,
    'end_date', end_date,
    'franchise_id', franchise_id_input,
    'trends', jsonb_agg(
      jsonb_build_object(
        'period', period,
        'revenue', revenue,
        'order_count', order_count
      )
    )
  )
  INTO result
  FROM revenue_data;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manage franchise subscription
CREATE OR REPLACE FUNCTION manage_franchise_subscription(
  franchise_id_input uuid,
  subscription_status text,
  features_enabled jsonb DEFAULT NULL
)
RETURNS boolean AS $$
BEGIN
  -- Only super admins can manage subscriptions
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can manage franchise subscriptions';
  END IF;

  -- Update franchise settings
  UPDATE public.franchises
  SET settings = settings || jsonb_build_object(
    'subscription_status', subscription_status,
    'features_enabled', COALESCE(features_enabled, settings->'features_enabled')
  )
  WHERE id = franchise_id_input;

  -- Log the activity
  PERFORM log_super_admin_activity(
    (SELECT id FROM public.super_admin WHERE auth_id = auth.uid()),
    'update_franchise_subscription',
    jsonb_build_object(
      'franchise_id', franchise_id_input,
      'subscription_status', subscription_status,
      'features_enabled', features_enabled
    )
  );

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get system health metrics
CREATE OR REPLACE FUNCTION get_system_health_metrics()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  -- Only super admins can access system health metrics
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can access system health metrics';
  END IF;

  WITH metrics AS (
    SELECT
      (SELECT COUNT(*) FROM public.franchises) as total_franchises,
      (SELECT COUNT(*) FROM public.staff) as total_staff,
      (SELECT COUNT(*) FROM public.orders 
       WHERE created_at >= now() - interval '24 hours') as orders_last_24h,
      (SELECT COUNT(*) FROM public.orders 
       WHERE status = 'pending') as pending_orders,
      (SELECT COUNT(*) FROM public.staff 
       WHERE created_at >= now() - interval '7 days') as new_staff_7d,
      (SELECT COUNT(*) FROM public.menu_items) as total_menu_items
  )
  SELECT jsonb_build_object(
    'timestamp', now(),
    'metrics', jsonb_build_object(
      'total_franchises', total_franchises,
      'total_staff', total_staff,
      'orders_last_24h', orders_last_24h,
      'pending_orders', pending_orders,
      'new_staff_7d', new_staff_7d,
      'total_menu_items', total_menu_items
    )
  )
  INTO result
  FROM metrics;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle franchise creation with initial setup
CREATE OR REPLACE FUNCTION create_franchise_with_setup(
  name_input text,
  address_input text,
  settings_input jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  new_franchise_id uuid;
  default_settings jsonb;
BEGIN
  -- Only super admins can create franchises
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can create franchises';
  END IF;

  -- Set default settings if not provided
  default_settings := jsonb_build_object(
    'subscription_status', 'active',
    'max_staff_count', 50,
    'features_enabled', jsonb_build_array('pos', 'kitchen', 'reports')
  );

  -- Create franchise
  INSERT INTO public.franchises (name, address, settings)
  VALUES (
    name_input, 
    address_input, 
    COALESCE(settings_input, default_settings)
  )
  RETURNING id INTO new_franchise_id;

  -- Create default franchise settings
  INSERT INTO public.franchise_settings (
    franchise_id,
    business_name,
    tax_rate,
    currency
  )
  VALUES (
    new_franchise_id,
    name_input,
    5.00,
    'INR'
  );

  -- Log the activity
  PERFORM log_super_admin_activity(
    (SELECT id FROM public.super_admin WHERE auth_id = auth.uid()),
    'create_franchise',
    jsonb_build_object(
      'franchise_id', new_franchise_id,
      'name', name_input,
      'address', address_input
    )
  );

  RETURN new_franchise_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
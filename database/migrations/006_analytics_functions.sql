-- File: database/migrations/006_analytics_functions.sql

-- Function: Get user registration trends
CREATE OR REPLACE FUNCTION get_user_registration_trends(
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  total_registrations BIGINT,
  admin_count BIGINT,
  ketua_tim_count BIGINT,
  pegawai_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - INTERVAL '1 day' * days_back,
      CURRENT_DATE,
      '1 day'::INTERVAL
    )::DATE as date
  )
  SELECT 
    ds.date,
    COALESCE(COUNT(u.id), 0) as total_registrations,
    COALESCE(COUNT(u.id) FILTER (WHERE u.role = 'admin'), 0) as admin_count,
    COALESCE(COUNT(u.id) FILTER (WHERE u.role = 'ketua_tim'), 0) as ketua_tim_count,
    COALESCE(COUNT(u.id) FILTER (WHERE u.role = 'pegawai'), 0) as pegawai_count
  FROM date_series ds
  LEFT JOIN users u ON ds.date = u.created_at::DATE
  GROUP BY ds.date
  ORDER BY ds.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get project analytics
CREATE OR REPLACE FUNCTION get_project_analytics(
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  projects_created BIGINT,
  projects_completed BIGINT,
  active_projects BIGINT,
  total_projects BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - INTERVAL '1 day' * days_back,
      CURRENT_DATE,
      '1 day'::INTERVAL
    )::DATE as date
  )
  SELECT 
    ds.date,
    COALESCE(COUNT(p.id) FILTER (WHERE p.created_at::DATE = ds.date), 0) as projects_created,
    COALESCE(COUNT(p.id) FILTER (WHERE p.updated_at::DATE = ds.date AND p.status = 'completed'), 0) as projects_completed,
    COALESCE(COUNT(p.id) FILTER (WHERE p.status = 'active' AND p.tanggal_mulai <= ds.date AND p.deadline >= ds.date), 0) as active_projects,
    COALESCE((SELECT COUNT(*) FROM projects WHERE created_at::DATE <= ds.date), 0) as total_projects
  FROM date_series ds
  LEFT JOIN projects p ON (p.created_at::DATE = ds.date OR p.updated_at::DATE = ds.date)
  GROUP BY ds.date
  ORDER BY ds.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get financial analytics
CREATE OR REPLACE FUNCTION get_financial_analytics(
  months_back INTEGER DEFAULT 12
)
RETURNS TABLE (
  month_year TEXT,
  month_num INTEGER,
  year_num INTEGER,
  total_spending DECIMAL(12,2),
  transport_spending DECIMAL(12,2),
  honor_spending DECIMAL(12,2),
  project_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH month_series AS (
    SELECT 
      generate_series(
        DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month' * months_back),
        DATE_TRUNC('month', CURRENT_DATE),
        '1 month'::INTERVAL
      ) as month_date
  )
  SELECT 
    TO_CHAR(ms.month_date, 'Mon YYYY') as month_year,
    EXTRACT(MONTH FROM ms.month_date)::INTEGER as month_num,
    EXTRACT(YEAR FROM ms.month_date)::INTEGER as year_num,
    COALESCE(SUM(fr.amount), 0)::DECIMAL(12,2) as total_spending,
    COALESCE(SUM(fr.amount) FILTER (WHERE fr.recipient_type = 'pegawai'), 0)::DECIMAL(12,2) as transport_spending,
    COALESCE(SUM(fr.amount) FILTER (WHERE fr.recipient_type = 'mitra'), 0)::DECIMAL(12,2) as honor_spending,
    COALESCE(COUNT(DISTINCT fr.project_id), 0) as project_count
  FROM month_series ms
  LEFT JOIN financial_records fr ON (
    fr.bulan = EXTRACT(MONTH FROM ms.month_date)
    AND fr.tahun = EXTRACT(YEAR FROM ms.month_date)
  )
  GROUP BY ms.month_date
  ORDER BY ms.month_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get system performance metrics
CREATE OR REPLACE FUNCTION get_system_performance_metrics()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'database_size', pg_size_pretty(pg_database_size(current_database())),
    'total_tables', (
      SELECT COUNT(*) 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    ),
    'total_users', (SELECT COUNT(*) FROM users),
    'active_users', (SELECT COUNT(*) FROM users WHERE is_active = true),
    'total_projects', (SELECT COUNT(*) FROM projects),
    'active_projects', (SELECT COUNT(*) FROM projects WHERE status = 'active'),
    'completed_projects', (SELECT COUNT(*) FROM projects WHERE status = 'completed'),
    'total_tasks', (SELECT COUNT(*) FROM tasks),
    'pending_tasks', (SELECT COUNT(*) FROM tasks WHERE status = 'pending'),
    'completed_tasks', (SELECT COUNT(*) FROM tasks WHERE status = 'completed'),
    'total_mitra', (SELECT COUNT(*) FROM mitra),
    'active_mitra', (SELECT COUNT(*) FROM mitra WHERE is_active = true),
    'total_notifications', (SELECT COUNT(*) FROM notifications),
    'unread_notifications', (SELECT COUNT(*) FROM notifications WHERE is_read = false),
    'this_month_spending', (
      SELECT COALESCE(SUM(amount), 0) 
      FROM financial_records 
      WHERE bulan = EXTRACT(MONTH FROM CURRENT_DATE)
        AND tahun = EXTRACT(YEAR FROM CURRENT_DATE)
    ),
    'avg_project_duration', (
      SELECT COALESCE(AVG(deadline - tanggal_mulai), 0)
      FROM projects 
      WHERE status = 'completed'
    ),
    'user_roles_distribution', (
      SELECT json_object_agg(role, count)
      FROM (
        SELECT role, COUNT(*) as count
        FROM users 
        WHERE is_active = true
        GROUP BY role
      ) role_counts
    ),
    'project_status_distribution', (
      SELECT json_object_agg(status, count)
      FROM (
        SELECT status, COUNT(*) as count
        FROM projects
        GROUP BY status
      ) status_counts
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
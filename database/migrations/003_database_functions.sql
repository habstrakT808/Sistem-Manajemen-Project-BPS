-- Function: Get pegawai workload indicator
CREATE OR REPLACE FUNCTION get_pegawai_workload(
  pegawai_id UUID,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE DEFAULT CURRENT_DATE + INTERVAL '30 days'
)
RETURNS TABLE (
  project_count INTEGER,
  workload_level TEXT
) AS $$
DECLARE
  project_count INTEGER;
BEGIN
  -- Count active projects for the pegawai in the date range
  SELECT COUNT(DISTINCT p.id) INTO project_count
  FROM projects p
  JOIN project_assignments pa ON p.id = pa.project_id
  WHERE pa.assignee_type = 'pegawai'
    AND pa.assignee_id = pegawai_id
    AND p.status IN ('upcoming', 'active')
    AND (
      (p.tanggal_mulai <= end_date AND p.deadline >= start_date)
    );

  -- Determine workload level
  RETURN QUERY SELECT 
    project_count,
    CASE 
      WHEN project_count <= 2 THEN 'low'
      WHEN project_count <= 4 THEN 'medium'
      ELSE 'high'
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get mitra monthly financial total
CREATE OR REPLACE FUNCTION get_mitra_monthly_total(
  mitra_id UUID,
  month INTEGER,
  year INTEGER
)
RETURNS TABLE (
  total_amount DECIMAL(12,2)
) AS $$
BEGIN
  RETURN QUERY 
  SELECT COALESCE(SUM(fr.amount), 0)::DECIMAL(12,2)
  FROM financial_records fr
  WHERE fr.recipient_type = 'mitra'
    AND fr.recipient_id = mitra_id
    AND fr.bulan = month
    AND fr.tahun = year;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update project status based on dates
CREATE OR REPLACE FUNCTION update_project_status()
RETURNS VOID AS $$
BEGIN
  -- Update to active
  UPDATE projects 
  SET status = 'active', updated_at = NOW()
  WHERE status = 'upcoming' 
    AND tanggal_mulai <= CURRENT_DATE;

  -- Update to completed
  UPDATE projects 
  SET status = 'completed', updated_at = NOW()
  WHERE status IN ('upcoming', 'active') 
    AND deadline < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update mitra average rating
CREATE OR REPLACE FUNCTION update_mitra_rating(mitra_id UUID)
RETURNS VOID AS $$
DECLARE
  avg_rating DECIMAL(3,2);
BEGIN
  -- Calculate average rating
  SELECT COALESCE(AVG(rating), 0)::DECIMAL(3,2) INTO avg_rating
  FROM mitra_reviews
  WHERE mitra_reviews.mitra_id = update_mitra_rating.mitra_id;

  -- Update mitra rating
  UPDATE mitra 
  SET rating_average = avg_rating, updated_at = NOW()
  WHERE id = update_mitra_rating.mitra_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check mitra monthly limit before assignment
CREATE OR REPLACE FUNCTION check_mitra_monthly_limit(
  mitra_id UUID,
  additional_amount DECIMAL(12,2),
  month INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
  year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  current_total DECIMAL(12,2);
  limit_amount DECIMAL(12,2) := 3300000.00; -- 3.3 juta
BEGIN
  -- Get current monthly total
  SELECT total_amount INTO current_total
  FROM get_mitra_monthly_total(mitra_id, month, year);

  -- Check if adding the additional amount exceeds limit
  RETURN (current_total + additional_amount) <= limit_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get dashboard statistics
CREATE OR REPLACE FUNCTION get_dashboard_stats(user_id UUID)
RETURNS JSON AS $$
DECLARE
  user_role_val user_role;
  result JSON;
BEGIN
  -- Get user role
  SELECT role INTO user_role_val FROM users WHERE id = user_id;

  CASE user_role_val
    WHEN 'admin' THEN
      SELECT json_build_object(
        'total_users', (SELECT COUNT(*) FROM users WHERE is_active = true),
        'active_projects', (SELECT COUNT(*) FROM projects WHERE status = 'active'),
        'completed_projects', (SELECT COUNT(*) FROM projects WHERE status = 'completed'),
        'total_mitra', (SELECT COUNT(*) FROM mitra WHERE is_active = true),
        'monthly_spending', (
          SELECT COALESCE(SUM(amount), 0) 
          FROM financial_records 
          WHERE bulan = EXTRACT(MONTH FROM CURRENT_DATE)
            AND tahun = EXTRACT(YEAR FROM CURRENT_DATE)
        )
      ) INTO result;

    WHEN 'ketua_tim' THEN
      SELECT json_build_object(
        'my_projects', (SELECT COUNT(*) FROM projects WHERE ketua_tim_id = user_id),
        'active_projects', (SELECT COUNT(*) FROM projects WHERE ketua_tim_id = user_id AND status = 'active'),
        'team_members', (
          SELECT COUNT(DISTINCT pa.assignee_id) 
          FROM project_assignments pa
          JOIN projects p ON pa.project_id = p.id
          WHERE p.ketua_tim_id = user_id AND pa.assignee_type = 'pegawai'
        ),
        'pending_tasks', (
          SELECT COUNT(*) 
          FROM tasks t
          JOIN projects p ON t.project_id = p.id
          WHERE p.ketua_tim_id = user_id AND t.status = 'pending'
        ),
        'monthly_budget', (
          SELECT COALESCE(SUM(fr.amount), 0)
          FROM financial_records fr
          JOIN projects p ON fr.project_id = p.id
          WHERE p.ketua_tim_id = user_id
            AND fr.bulan = EXTRACT(MONTH FROM CURRENT_DATE)
            AND fr.tahun = EXTRACT(YEAR FROM CURRENT_DATE)
        )
      ) INTO result;

    WHEN 'pegawai' THEN
      SELECT json_build_object(
        'assigned_projects', (
          SELECT COUNT(DISTINCT pa.project_id)
          FROM project_assignments pa
          WHERE pa.assignee_type = 'pegawai' AND pa.assignee_id = user_id
        ),
        'active_tasks', (
          SELECT COUNT(*) 
          FROM tasks 
          WHERE pegawai_id = user_id AND status IN ('pending', 'in_progress')
        ),
        'completed_tasks', (
          SELECT COUNT(*) 
          FROM tasks 
          WHERE pegawai_id = user_id AND status = 'completed'
        ),
        'monthly_earnings', (
          SELECT COALESCE(SUM(fr.amount), 0)
          FROM financial_records fr
          WHERE fr.recipient_type = 'pegawai' 
            AND fr.recipient_id = user_id
            AND fr.bulan = EXTRACT(MONTH FROM CURRENT_DATE)
            AND fr.tahun = EXTRACT(YEAR FROM CURRENT_DATE)
        ),
        'pending_reviews', (
          SELECT COUNT(DISTINCT pa.assignee_id)
          FROM project_assignments pa
          JOIN projects p ON pa.project_id = p.id
          WHERE p.status = 'completed'
            AND pa.assignee_type = 'mitra'
            AND EXISTS (
              SELECT 1 FROM project_assignments pa2
              WHERE pa2.project_id = p.id 
                AND pa2.assignee_type = 'pegawai' 
                AND pa2.assignee_id = user_id
            )
            AND NOT EXISTS (
              SELECT 1 FROM mitra_reviews mr
              WHERE mr.project_id = p.id 
                AND mr.mitra_id = pa.assignee_id 
                AND mr.pegawai_id = user_id
            )
        )
      ) INTO result;
    
    ELSE
      result := json_build_object('error', 'Invalid user role');
  END CASE;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Create notification
CREATE OR REPLACE FUNCTION create_notification(
  user_id UUID,
  title TEXT,
  message TEXT,
  notification_type notification_type DEFAULT 'info'
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, title, message, type)
  VALUES (user_id, title, message, notification_type)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- File: database/migrations/014_transport_functions.sql
-- Functions for transport management and earnings

-- Function: Create transport allocation for task
CREATE OR REPLACE FUNCTION create_transport_allocation(
  task_id_param UUID,
  user_id_param UUID,
  allocation_date_param DATE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  allocation_id UUID;
  task_start DATE;
  task_end DATE;
BEGIN
  -- Get task date range
  SELECT start_date, end_date INTO task_start, task_end
  FROM tasks WHERE id = task_id_param;

  -- Validate allocation date is within task range
  IF allocation_date_param IS NOT NULL THEN
    IF allocation_date_param < task_start OR allocation_date_param > task_end THEN
      RAISE EXCEPTION 'Allocation date must be within task date range (% to %)', task_start, task_end;
    END IF;

    -- Check if user already has transport on this date
    IF EXISTS (
      SELECT 1 FROM task_transport_allocations 
      WHERE user_id = user_id_param 
      AND allocation_date = allocation_date_param 
      AND canceled_at IS NULL
    ) THEN
      RAISE EXCEPTION 'User already has transport allocation on this date';
    END IF;
  END IF;

  -- Create allocation
  INSERT INTO task_transport_allocations (
    task_id, user_id, amount, allocation_date, allocated_at
  ) VALUES (
    task_id_param, 
    user_id_param, 
    150000,
    allocation_date_param,
    CASE WHEN allocation_date_param IS NOT NULL THEN NOW() ELSE NULL END
  ) RETURNING id INTO allocation_id;

  -- Create earnings ledger entry if date is set
  IF allocation_date_param IS NOT NULL THEN
    INSERT INTO earnings_ledger (
      user_id, type, source_table, source_id, amount, occurred_on
    ) VALUES (
      user_id_param, 'transport', 'task_transport_allocations', allocation_id, 150000, allocation_date_param
    );
  END IF;

  RETURN allocation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Cancel transport allocation
CREATE OR REPLACE FUNCTION cancel_transport_allocation(allocation_id_param UUID)
RETURNS VOID AS $$
BEGIN
  -- Cancel allocation
  UPDATE task_transport_allocations 
  SET canceled_at = NOW()
  WHERE id = allocation_id_param;

  -- Remove from earnings ledger
  DELETE FROM earnings_ledger 
  WHERE source_table = 'task_transport_allocations' 
  AND source_id = allocation_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get available dates for transport allocation
CREATE OR REPLACE FUNCTION get_available_transport_dates(
  user_id_param UUID,
  task_id_param UUID
)
RETURNS TABLE (
  date DATE,
  available BOOLEAN
) AS $$
DECLARE
  task_start DATE;
  task_end DATE;
BEGIN
  -- Get task date range
  SELECT start_date, end_date INTO task_start, task_end
  FROM tasks WHERE id = task_id_param;

  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(task_start, task_end, '1 day'::INTERVAL)::DATE as date
  )
  SELECT 
    ds.date,
    NOT EXISTS (
      SELECT 1 FROM task_transport_allocations tta
      WHERE tta.user_id = user_id_param 
      AND tta.allocation_date = ds.date 
      AND tta.canceled_at IS NULL
    ) as available
  FROM date_series ds
  ORDER BY ds.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get user's projects (for pegawai landing)
CREATE OR REPLACE FUNCTION get_user_projects(user_id_param UUID)
RETURNS TABLE (
  project_id UUID,
  project_name TEXT,
  project_description TEXT,
  project_status TEXT,
  start_date DATE,
  deadline DATE,
  user_role TEXT,
  leader_name TEXT,
  team_size BIGINT,
  my_tasks_count BIGINT,
  my_pending_tasks BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as project_id,
    p.nama_project as project_name,
    p.deskripsi as project_description,
    p.status::TEXT as project_status,
    p.tanggal_mulai as start_date,
    p.deadline,
    pm.role as user_role,
    leader.nama_lengkap as leader_name,
    (SELECT COUNT(*) FROM project_members pm2 WHERE pm2.project_id = p.id) as team_size,
    (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.assignee_user_id = user_id_param) as my_tasks_count,
    (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.assignee_user_id = user_id_param AND t.status = 'pending') as my_pending_tasks
  FROM projects p
  JOIN project_members pm ON p.id = pm.project_id
  JOIN users leader ON p.leader_user_id = leader.id
  WHERE pm.user_id = user_id_param
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-create transport allocation when task has_transport = true
CREATE OR REPLACE FUNCTION trigger_task_transport_allocation()
RETURNS TRIGGER AS $$
BEGIN
  -- If has_transport is set to true, create allocation record
  IF NEW.has_transport = true AND (OLD.has_transport IS NULL OR OLD.has_transport = false) THEN
    PERFORM create_transport_allocation(NEW.id, NEW.assignee_user_id);
  END IF;

  -- If has_transport is set to false, cancel existing allocation
  IF NEW.has_transport = false AND OLD.has_transport = true THEN
    UPDATE task_transport_allocations 
    SET canceled_at = NOW()
    WHERE task_id = NEW.id AND canceled_at IS NULL;
    
    DELETE FROM earnings_ledger 
    WHERE source_table = 'task_transport_allocations' 
    AND source_id IN (
      SELECT id FROM task_transport_allocations WHERE task_id = NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_transport_allocation_trigger
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION trigger_task_transport_allocation();

-- Function: Update earnings when transport allocation date is set
CREATE OR REPLACE FUNCTION trigger_transport_earnings()
RETURNS TRIGGER AS $$
BEGIN
  -- When allocation_date is set, create earnings entry
  IF NEW.allocation_date IS NOT NULL AND OLD.allocation_date IS NULL THEN
    INSERT INTO earnings_ledger (
      user_id, type, source_table, source_id, amount, occurred_on
    ) VALUES (
      NEW.user_id, 'transport', 'task_transport_allocations', NEW.id, NEW.amount, NEW.allocation_date
    );
    
    NEW.allocated_at = NOW();
  END IF;

  -- When allocation_date is changed, update earnings
  IF NEW.allocation_date IS NOT NULL AND OLD.allocation_date IS NOT NULL AND NEW.allocation_date != OLD.allocation_date THEN
    UPDATE earnings_ledger 
    SET occurred_on = NEW.allocation_date
    WHERE source_table = 'task_transport_allocations' AND source_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transport_earnings_trigger
  BEFORE UPDATE ON task_transport_allocations
  FOR EACH ROW EXECUTE FUNCTION trigger_transport_earnings();
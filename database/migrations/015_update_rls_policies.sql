-- File: database/migrations/015_update_rls_policies.sql
-- Update RLS policies for new major update structure

-- Drop old policies that conflict
DROP POLICY IF EXISTS "Ketua tim can manage their projects" ON projects;
DROP POLICY IF EXISTS "Pegawai can view assigned projects" ON projects;
DROP POLICY IF EXISTS "Ketua tim can manage tasks in their projects" ON tasks;
DROP POLICY IF EXISTS "Pegawai can view and update their tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can view all tasks" ON tasks;

-- New project policies
CREATE POLICY "Project leaders can manage their projects" ON projects
  FOR ALL USING (leader_user_id = auth.uid());

CREATE POLICY "Project members can view their projects" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members pm 
      WHERE pm.project_id = projects.id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all projects" ON projects
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- New task policies
CREATE POLICY "Project leaders can manage tasks in their projects" ON tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = tasks.project_id AND p.leader_user_id = auth.uid()
    )
  );

CREATE POLICY "Task assignees can view and update their tasks" ON tasks
  FOR SELECT USING (assignee_user_id = auth.uid());

CREATE POLICY "Task assignees can update task status and response" ON tasks
  FOR UPDATE USING (
    assignee_user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'pegawai')
  );

CREATE POLICY "Admins can view all tasks" ON tasks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Update helper functions for new structure
CREATE OR REPLACE FUNCTION is_project_leader(project_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects 
    WHERE id = project_id_param AND leader_user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_project_member(project_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_id = project_id_param AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update dashboard stats function for new structure
CREATE OR REPLACE FUNCTION get_dashboard_stats_v2(user_id UUID)
RETURNS JSON AS $$
DECLARE
  user_role_val user_role;
  result JSON;
BEGIN
  SELECT role INTO user_role_val FROM users WHERE id = user_id;

  CASE user_role_val
    WHEN 'admin' THEN
      SELECT json_build_object(
        'total_users', (SELECT COUNT(*) FROM users WHERE is_active = true),
        'active_projects', (SELECT COUNT(*) FROM projects WHERE status = 'active'),
        'completed_projects', (SELECT COUNT(*) FROM projects WHERE status = 'completed'),
        'total_teams', (SELECT COUNT(*) FROM teams),
        'total_mitra', (SELECT COUNT(*) FROM mitra WHERE is_active = true),
        'monthly_transport', (
          SELECT COALESCE(SUM(amount), 0) 
          FROM earnings_ledger 
          WHERE type = 'transport'
          AND EXTRACT(MONTH FROM occurred_on) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(YEAR FROM occurred_on) = EXTRACT(YEAR FROM CURRENT_DATE)
        )
      ) INTO result;

    WHEN 'ketua_tim' THEN
      SELECT json_build_object(
        'my_projects', (SELECT COUNT(*) FROM projects WHERE leader_user_id = user_id),
        'active_projects', (SELECT COUNT(*) FROM projects WHERE leader_user_id = user_id AND status = 'active'),
        'team_members', (
          SELECT COUNT(DISTINCT pm.user_id) 
          FROM project_members pm
          JOIN projects p ON pm.project_id = p.id
          WHERE p.leader_user_id = user_id AND pm.role = 'member'
        ),
        'pending_tasks', (
          SELECT COUNT(*) 
          FROM tasks t
          JOIN projects p ON t.project_id = p.id
          WHERE p.leader_user_id = user_id AND t.status = 'pending'
        ),
        'monthly_budget', (
          SELECT COALESCE(SUM(el.amount), 0)
          FROM earnings_ledger el
          JOIN tasks t ON el.source_id::text = t.id::text
          JOIN projects p ON t.project_id = p.id
          WHERE p.leader_user_id = user_id
          AND el.type = 'transport'
          AND EXTRACT(MONTH FROM el.occurred_on) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(YEAR FROM el.occurred_on) = EXTRACT(YEAR FROM CURRENT_DATE)
        )
      ) INTO result;

    WHEN 'pegawai' THEN
      SELECT json_build_object(
        'assigned_projects', (
          SELECT COUNT(*) FROM project_members WHERE user_id = user_id
        ),
        'active_tasks', (
          SELECT COUNT(*) 
          FROM tasks 
          WHERE assignee_user_id = user_id AND status IN ('pending', 'in_progress')
        ),
        'completed_tasks', (
          SELECT COUNT(*) 
          FROM tasks 
          WHERE assignee_user_id = user_id AND status = 'completed'
        ),
        'monthly_earnings', (
          SELECT COALESCE(SUM(amount), 0)
          FROM earnings_ledger
          WHERE user_id = user_id
          AND EXTRACT(MONTH FROM occurred_on) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(YEAR FROM occurred_on) = EXTRACT(YEAR FROM CURRENT_DATE)
        ),
        'pending_reviews', (
          SELECT COUNT(DISTINCT pa.assignee_id)
          FROM project_assignments pa
          JOIN projects p ON pa.project_id = p.id
          WHERE p.status = 'completed'
          AND pa.assignee_type = 'mitra'
          AND EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = p.id AND pm.user_id = user_id
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
-- File: database/migrations/013_major_update_schema.sql
-- MAJOR UPDATE: New schema for transport per task, teams, and enhanced structure

-- Drop existing constraints that will conflict
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_project_id_fkey;
ALTER TABLE project_assignments DROP CONSTRAINT IF EXISTS project_assignments_project_id_fkey;

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  leader_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- Add team_id to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS leader_user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Update projects to have leader_user_id (copy from ketua_tim_id)
UPDATE projects SET leader_user_id = ketua_tim_id WHERE leader_user_id IS NULL;

-- Create project_members table for explicit membership
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('leader', 'member')) NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  UNIQUE(project_id, user_id)
);

-- Update tasks table for new structure
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS has_transport BOOLEAN DEFAULT false;

-- Copy existing data to new structure
UPDATE tasks SET 
  title = LEFT(deskripsi_tugas, 100),
  assignee_user_id = pegawai_id,
  start_date = tanggal_tugas,
  end_date = tanggal_tugas,
  has_transport = false
WHERE title IS NULL;

-- Create task_transport_allocations table
CREATE TABLE IF NOT EXISTS task_transport_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL DEFAULT 150000 CHECK (amount = 150000),
  allocation_date DATE,
  allocated_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  UNIQUE(task_id),
  UNIQUE(user_id, allocation_date)
);

-- Create earnings_ledger table
CREATE TABLE IF NOT EXISTS earnings_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('transport', 'honor', 'bonus')),
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'IDR',
  occurred_on DATE NOT NULL,
  posted_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  UNIQUE(type, source_table, source_id)
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID NOT NULL,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_teams_leader ON teams(leader_user_id);
CREATE INDEX IF NOT EXISTS idx_projects_team_id ON projects(team_id);
CREATE INDEX IF NOT EXISTS idx_projects_leader ON projects(leader_user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_dates ON tasks(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_transport_allocations_user_date ON task_transport_allocations(user_id, allocation_date);
CREATE INDEX IF NOT EXISTS idx_transport_allocations_task ON task_transport_allocations(task_id);
CREATE INDEX IF NOT EXISTS idx_earnings_user_date ON earnings_ledger(user_id, occurred_on);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id);

-- Enable RLS on new tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_transport_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE earnings_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for new tables
-- Teams policies
CREATE POLICY "Admins can manage teams" ON teams FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Team leaders can view their teams" ON teams FOR SELECT USING (
  leader_user_id = auth.uid()
);

CREATE POLICY "Users can view teams they belong to" ON teams FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM projects p 
    JOIN project_members pm ON p.id = pm.project_id 
    WHERE p.team_id = teams.id AND pm.user_id = auth.uid()
  )
);

-- Project members policies  
CREATE POLICY "Project leaders can manage members" ON project_members FOR ALL USING (
  EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = project_members.project_id AND p.leader_user_id = auth.uid()
  )
);

CREATE POLICY "Members can view project membership" ON project_members FOR SELECT USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = project_members.project_id AND p.leader_user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all project members" ON project_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Transport allocations policies
CREATE POLICY "Users can manage their transport allocations" ON task_transport_allocations FOR ALL USING (
  user_id = auth.uid()
);

CREATE POLICY "Project leaders can manage transport for their projects" ON task_transport_allocations FOR ALL USING (
  EXISTS (
    SELECT 1 FROM tasks t 
    JOIN projects p ON t.project_id = p.id 
    WHERE t.id = task_transport_allocations.task_id AND p.leader_user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all transport allocations" ON task_transport_allocations FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Earnings ledger policies
CREATE POLICY "Users can view their earnings" ON earnings_ledger FOR SELECT USING (
  user_id = auth.uid()
);

CREATE POLICY "Project leaders can view earnings for their projects" ON earnings_ledger FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tasks t 
    JOIN projects p ON t.project_id = p.id 
    WHERE p.leader_user_id = auth.uid()
    AND (
      (earnings_ledger.source_table = 'task_transport_allocations' AND earnings_ledger.source_id::text = t.id::text) OR
      (earnings_ledger.source_table = 'project_assignments' AND earnings_ledger.user_id = auth.uid())
    )
  )
);

CREATE POLICY "Admins can view all earnings" ON earnings_ledger FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Audit logs policies
CREATE POLICY "Admins can view all audit logs" ON audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can view their own actions" ON audit_logs FOR SELECT USING (
  actor_user_id = auth.uid()
);

-- Update triggers for new tables
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Populate project_members from existing project_assignments
INSERT INTO project_members (project_id, user_id, role, created_by)
SELECT DISTINCT 
  pa.project_id,
  pa.assignee_id,
  CASE WHEN pa.assignee_id = p.leader_user_id THEN 'leader' ELSE 'member' END,
  p.leader_user_id
FROM project_assignments pa
JOIN projects p ON pa.project_id = p.id
WHERE pa.assignee_type = 'pegawai'
ON CONFLICT (project_id, user_id) DO NOTHING;

-- Add leaders to project_members if not already there
INSERT INTO project_members (project_id, user_id, role, created_by)
SELECT 
  p.id,
  p.leader_user_id,
  'leader',
  p.leader_user_id
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_members pm 
  WHERE pm.project_id = p.id AND pm.user_id = p.leader_user_id
);
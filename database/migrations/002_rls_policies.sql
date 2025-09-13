-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE mitra ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mitra_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is ketua tim of a project
CREATE OR REPLACE FUNCTION is_project_ketua_tim(project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM projects 
    WHERE id = project_id AND ketua_tim_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is assigned to a project
CREATE OR REPLACE FUNCTION is_assigned_to_project(project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM project_assignments 
    WHERE project_id = project_id 
    AND assignee_type = 'pegawai' 
    AND assignee_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- USERS TABLE POLICIES
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (get_current_user_role() = 'admin');

CREATE POLICY "Ketua tim can view pegawai" ON users
  FOR SELECT USING (
    get_current_user_role() = 'ketua_tim' 
    AND role = 'pegawai'
  );

CREATE POLICY "Admins can insert users" ON users
  FOR INSERT WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update all users" ON users
  FOR UPDATE USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can delete users" ON users
  FOR DELETE USING (get_current_user_role() = 'admin');

-- MITRA TABLE POLICIES
CREATE POLICY "Admins can manage mitra" ON mitra
  FOR ALL USING (get_current_user_role() = 'admin');

CREATE POLICY "Ketua tim can view active mitra" ON mitra
  FOR SELECT USING (
    get_current_user_role() = 'ketua_tim' 
    AND is_active = true
  );

CREATE POLICY "Pegawai can view mitra in their projects" ON mitra
  FOR SELECT USING (
    get_current_user_role() = 'pegawai'
    AND EXISTS (
      SELECT 1 FROM project_assignments pa
      JOIN projects p ON pa.project_id = p.id
      WHERE pa.assignee_type = 'mitra' 
      AND pa.assignee_id = mitra.id
      AND EXISTS (
        SELECT 1 FROM project_assignments pa2
        WHERE pa2.project_id = p.id
        AND pa2.assignee_type = 'pegawai'
        AND pa2.assignee_id = auth.uid()
      )
    )
  );

-- PROJECTS TABLE POLICIES
CREATE POLICY "Ketua tim can manage their projects" ON projects
  FOR ALL USING (ketua_tim_id = auth.uid());

CREATE POLICY "Pegawai can view assigned projects" ON projects
  FOR SELECT USING (
    get_current_user_role() = 'pegawai'
    AND is_assigned_to_project(id)
  );

CREATE POLICY "Admins can view all projects" ON projects
  FOR SELECT USING (get_current_user_role() = 'admin');

-- PROJECT ASSIGNMENTS TABLE POLICIES
CREATE POLICY "Ketua tim can manage assignments for their projects" ON project_assignments
  FOR ALL USING (is_project_ketua_tim(project_id));

CREATE POLICY "Pegawai can view assignments in their projects" ON project_assignments
  FOR SELECT USING (
    get_current_user_role() = 'pegawai'
    AND is_assigned_to_project(project_id)
  );

CREATE POLICY "Admins can view all assignments" ON project_assignments
  FOR SELECT USING (get_current_user_role() = 'admin');

-- TASKS TABLE POLICIES
CREATE POLICY "Ketua tim can manage tasks in their projects" ON tasks
  FOR ALL USING (is_project_ketua_tim(project_id));

CREATE POLICY "Pegawai can view and update their tasks" ON tasks
  FOR SELECT USING (pegawai_id = auth.uid());

CREATE POLICY "Pegawai can update their task responses" ON tasks
  FOR UPDATE USING (
    pegawai_id = auth.uid()
    AND get_current_user_role() = 'pegawai'
  );

CREATE POLICY "Admins can view all tasks" ON tasks
  FOR SELECT USING (get_current_user_role() = 'admin');

-- MITRA REVIEWS TABLE POLICIES
CREATE POLICY "Pegawai can create reviews for mitra in completed projects" ON mitra_reviews
  FOR INSERT WITH CHECK (
    pegawai_id = auth.uid()
    AND get_current_user_role() = 'pegawai'
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id
      AND p.status = 'completed'
      AND is_assigned_to_project(project_id)
    )
  );

CREATE POLICY "Users can view reviews" ON mitra_reviews
  FOR SELECT USING (
    get_current_user_role() IN ('admin', 'ketua_tim')
    OR pegawai_id = auth.uid()
  );

-- FINANCIAL RECORDS TABLE POLICIES
CREATE POLICY "Ketua tim can manage financial records for their projects" ON financial_records
  FOR ALL USING (is_project_ketua_tim(project_id));

CREATE POLICY "Admins can view all financial records" ON financial_records
  FOR SELECT USING (get_current_user_role() = 'admin');

CREATE POLICY "Pegawai can view their own financial records" ON financial_records
  FOR SELECT USING (
    get_current_user_role() = 'pegawai'
    AND recipient_type = 'pegawai'
    AND recipient_id = auth.uid()
  );

-- NOTIFICATIONS TABLE POLICIES
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all notifications" ON notifications
  FOR SELECT USING (get_current_user_role() = 'admin');
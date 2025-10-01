-- Migration: Add Mitra support to tasks table
-- This migration adds fields to support assigning tasks to Mitra

-- Add new columns to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_mitra_id UUID REFERENCES mitra(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS honor_amount DECIMAL(12,2) DEFAULT 0 CHECK (honor_amount >= 0);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS has_transport BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS transport_days INTEGER DEFAULT 0 CHECK (transport_days >= 0);

-- Make pegawai_id nullable since we can now have mitra assignments
ALTER TABLE tasks ALTER COLUMN pegawai_id DROP NOT NULL;

-- Add constraint to ensure either pegawai_id or assignee_mitra_id is set, but not both
ALTER TABLE tasks ADD CONSTRAINT check_assignee_exclusive 
  CHECK (
    (pegawai_id IS NOT NULL AND assignee_mitra_id IS NULL) OR
    (pegawai_id IS NULL AND assignee_mitra_id IS NOT NULL)
  );

-- Update existing data to populate new fields
UPDATE tasks SET 
  title = LEFT(deskripsi_tugas, 100),
  assignee_user_id = pegawai_id,
  start_date = tanggal_tugas,
  end_date = tanggal_tugas,
  has_transport = false,
  transport_days = 0,
  honor_amount = 0
WHERE title IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_mitra_id ON tasks(assignee_mitra_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_user_id ON tasks(assignee_user_id);

-- Update trigger function to handle mitra task notifications
CREATE OR REPLACE FUNCTION trigger_task_notification()
RETURNS TRIGGER AS $$
DECLARE
  project_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get project name
    SELECT nama_project INTO project_name
    FROM projects WHERE id = NEW.project_id;
    
    -- Send notification only to pegawai (mitra don't have access to the system)
    IF NEW.pegawai_id IS NOT NULL THEN
      PERFORM create_notification(
        NEW.pegawai_id,
        'Task Baru Ditugaskan',
        'Anda mendapat task baru untuk project: ' || project_name,
        'info'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle mitra honor allocation
CREATE OR REPLACE FUNCTION trigger_mitra_honor_allocation()
RETURNS TRIGGER AS $$
DECLARE
  project_month INTEGER;
  project_year INTEGER;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.assignee_mitra_id IS NOT NULL AND NEW.honor_amount > 0 THEN
    -- Get project month and year
    SELECT 
      EXTRACT(MONTH FROM tanggal_mulai)::INTEGER,
      EXTRACT(YEAR FROM tanggal_mulai)::INTEGER
    INTO project_month, project_year
    FROM projects WHERE id = NEW.project_id;
    
    -- Create financial record for mitra honor
    INSERT INTO financial_records (
      project_id, recipient_type, recipient_id, 
      amount, description, bulan, tahun
    ) VALUES (
      NEW.project_id, 'mitra', NEW.assignee_mitra_id,
      NEW.honor_amount, 'Honor mitra untuk task: ' || COALESCE(NEW.title, 'Task'), 
      project_month, project_year
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for mitra honor allocation
CREATE TRIGGER task_mitra_honor_allocation
  AFTER INSERT ON tasks
  FOR EACH ROW EXECUTE FUNCTION trigger_mitra_honor_allocation();

-- Add comment to document the changes
COMMENT ON COLUMN tasks.assignee_mitra_id IS 'Reference to mitra table for mitra task assignments';
COMMENT ON COLUMN tasks.honor_amount IS 'Honor amount for mitra tasks';
COMMENT ON CONSTRAINT check_assignee_exclusive ON tasks IS 'Ensures task is assigned to either pegawai or mitra, but not both';
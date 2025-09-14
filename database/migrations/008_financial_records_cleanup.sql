-- Migration: Fix financial records duplication issue
-- This migration adds triggers to properly manage financial records when project assignments are updated

-- Function to clean up old financial records for a project
CREATE OR REPLACE FUNCTION cleanup_project_financial_records(project_id_param UUID)
RETURNS VOID AS $$
BEGIN
  -- Delete existing financial records for this project
  DELETE FROM financial_records 
  WHERE project_id = project_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to recreate financial records for a project
CREATE OR REPLACE FUNCTION recreate_project_financial_records(project_id_param UUID)
RETURNS VOID AS $$
DECLARE
  project_start_date DATE;
  project_month INTEGER;
  project_year INTEGER;
  assignment_record RECORD;
BEGIN
  -- Get project start date
  SELECT tanggal_mulai INTO project_start_date
  FROM projects WHERE id = project_id_param;
  
  project_month := EXTRACT(MONTH FROM project_start_date);
  project_year := EXTRACT(YEAR FROM project_start_date);

  -- Recreate financial records for all current assignments
  FOR assignment_record IN
    SELECT assignee_type, assignee_id, uang_transport, honor
    FROM project_assignments 
    WHERE project_id = project_id_param
  LOOP
    -- Create financial record for pegawai (uang transport)
    IF assignment_record.assignee_type = 'pegawai' AND assignment_record.uang_transport > 0 THEN
      INSERT INTO financial_records (
        project_id, recipient_type, recipient_id, 
        amount, description, bulan, tahun
      ) VALUES (
        project_id_param, 'pegawai', assignment_record.assignee_id,
        assignment_record.uang_transport, 'Uang transport untuk project', 
        project_month, project_year
      );
    END IF;

    -- Create financial record for mitra (honor)
    IF assignment_record.assignee_type = 'mitra' AND assignment_record.honor > 0 THEN
      INSERT INTO financial_records (
        project_id, recipient_type, recipient_id, 
        amount, description, bulan, tahun
      ) VALUES (
        project_id_param, 'mitra', assignment_record.assignee_id,
        assignment_record.honor, 'Honor mitra untuk project', 
        project_month, project_year
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for UPDATE on project_assignments
CREATE OR REPLACE FUNCTION trigger_update_financial_record()
RETURNS TRIGGER AS $$
BEGIN
  -- Clean up and recreate financial records for the project
  PERFORM cleanup_project_financial_records(NEW.project_id);
  PERFORM recreate_project_financial_records(NEW.project_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for DELETE on project_assignments
CREATE OR REPLACE FUNCTION trigger_delete_financial_record()
RETURNS TRIGGER AS $$
BEGIN
  -- Clean up and recreate financial records for the project
  PERFORM cleanup_project_financial_records(OLD.project_id);
  PERFORM recreate_project_financial_records(OLD.project_id);
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER project_assignment_update_financial_record
  AFTER UPDATE ON project_assignments
  FOR EACH ROW EXECUTE FUNCTION trigger_update_financial_record();

CREATE TRIGGER project_assignment_delete_financial_record
  AFTER DELETE ON project_assignments
  FOR EACH ROW EXECUTE FUNCTION trigger_delete_financial_record();

-- Clean up existing duplicate financial records
-- This will remove all existing financial records and recreate them based on current assignments
DO $$
DECLARE
  project_record RECORD;
BEGIN
  -- For each project, clean up and recreate financial records
  FOR project_record IN
    SELECT DISTINCT project_id FROM project_assignments
  LOOP
    PERFORM cleanup_project_financial_records(project_record.project_id);
    PERFORM recreate_project_financial_records(project_record.project_id);
  END LOOP;
END $$;

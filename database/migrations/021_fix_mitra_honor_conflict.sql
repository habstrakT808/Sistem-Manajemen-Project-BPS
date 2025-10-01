-- Migration: Fix conflict between project_assignments honor and tasks honor_amount
-- This migration modifies the recreate_project_financial_records function to preserve task-based mitra honor records

-- Updated function to recreate financial records for a project
-- This version preserves task-based mitra honor records and only manages project assignment-based records
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

  -- Delete only project assignment-based financial records (not task-based ones)
  DELETE FROM financial_records 
  WHERE project_id = project_id_param 
    AND description NOT LIKE 'Honor mitra untuk task:%';

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

    -- Create financial record for mitra (honor) - only if no task-based records exist for this mitra
    IF assignment_record.assignee_type = 'mitra' AND assignment_record.honor > 0 THEN
      -- Check if there are any task-based honor records for this mitra in this project
      IF NOT EXISTS (
        SELECT 1 FROM financial_records 
        WHERE project_id = project_id_param 
          AND recipient_type = 'mitra' 
          AND recipient_id = assignment_record.assignee_id
          AND description LIKE 'Honor mitra untuk task:%'
      ) THEN
        INSERT INTO financial_records (
          project_id, recipient_type, recipient_id, 
          amount, description, bulan, tahun
        ) VALUES (
          project_id_param, 'mitra', assignment_record.assignee_id,
          assignment_record.honor, 'Honor mitra untuk project', 
          project_month, project_year
        );
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Updated cleanup function to preserve task-based mitra honor records
CREATE OR REPLACE FUNCTION cleanup_project_financial_records(project_id_param UUID)
RETURNS VOID AS $$
BEGIN
  -- Delete only project assignment-based financial records (not task-based ones)
  DELETE FROM financial_records 
  WHERE project_id = project_id_param 
    AND description NOT LIKE 'Honor mitra untuk task:%';
END;
$$ LANGUAGE plpgsql;

-- Clean up and recreate existing financial records with the new logic
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
-- Migration: Fix task status notification trigger for mitra tasks
-- Date: 2024-12-19
-- Description: Update trigger to handle both pegawai and mitra tasks properly

-- Drop existing trigger
DROP TRIGGER IF EXISTS task_status_change_notification ON tasks;

-- Update trigger function to handle both pegawai and mitra tasks
CREATE OR REPLACE FUNCTION trigger_task_status_notification()
RETURNS TRIGGER AS $$
DECLARE
  project_name TEXT;
  ketua_tim_id UUID;
  pegawai_name TEXT;
  mitra_name TEXT;
BEGIN
  IF OLD.status != NEW.status THEN
    -- Get project info
    SELECT p.nama_project, p.ketua_tim_id 
    INTO project_name, ketua_tim_id
    FROM projects p
    WHERE p.id = NEW.project_id;
    
    -- Get assignee name based on task type
    IF NEW.assignee_mitra_id IS NOT NULL THEN
      -- This is a mitra task
      SELECT m.nama_mitra INTO mitra_name
      FROM mitra m
      WHERE m.id = NEW.assignee_mitra_id;
      
      -- Notify ketua tim about mitra task status change
      IF NEW.status = 'completed' THEN
        PERFORM create_notification(
          ketua_tim_id,
          'Task Diselesaikan',
          'Mitra ' || COALESCE(mitra_name, 'Tidak Dikenal') || ' telah menyelesaikan task di project: ' || project_name,
          'success'
        );
      ELSIF NEW.status = 'in_progress' THEN
        PERFORM create_notification(
          ketua_tim_id,
          'Task Dimulai',
          'Mitra ' || COALESCE(mitra_name, 'Tidak Dikenal') || ' telah memulai task di project: ' || project_name,
          'info'
        );
      END IF;
    ELSE
      -- This is a pegawai task
      SELECT u.nama_lengkap INTO pegawai_name
      FROM users u
      WHERE u.id = NEW.pegawai_id;
      
      -- Notify ketua tim about pegawai task status change
      IF NEW.status = 'completed' THEN
        PERFORM create_notification(
          ketua_tim_id,
          'Task Diselesaikan',
          COALESCE(pegawai_name, 'Pegawai Tidak Dikenal') || ' telah menyelesaikan task di project: ' || project_name,
          'success'
        );
      ELSIF NEW.status = 'in_progress' THEN
        PERFORM create_notification(
          ketua_tim_id,
          'Task Dimulai',
          COALESCE(pegawai_name, 'Pegawai Tidak Dikenal') || ' telah memulai task di project: ' || project_name,
          'info'
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER task_status_change_notification
  AFTER UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION trigger_task_status_notification();

-- Trigger: Update mitra rating when review is added/updated/deleted
CREATE OR REPLACE FUNCTION trigger_update_mitra_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_mitra_rating(OLD.mitra_id);
    RETURN OLD;
  ELSE
    PERFORM update_mitra_rating(NEW.mitra_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mitra_review_rating_update
  AFTER INSERT OR UPDATE OR DELETE ON mitra_reviews
  FOR EACH ROW EXECUTE FUNCTION trigger_update_mitra_rating();

-- Trigger: Auto-create financial records when project assignment is created
CREATE OR REPLACE FUNCTION trigger_create_financial_record()
RETURNS TRIGGER AS $$
DECLARE
  project_start_date DATE;
  project_month INTEGER;
  project_year INTEGER;
BEGIN
  -- Get project start date
  SELECT tanggal_mulai INTO project_start_date
  FROM projects WHERE id = NEW.project_id;
  
  project_month := EXTRACT(MONTH FROM project_start_date);
  project_year := EXTRACT(YEAR FROM project_start_date);

  -- Create financial record for pegawai (uang transport)
  IF NEW.assignee_type = 'pegawai' AND NEW.uang_transport > 0 THEN
    INSERT INTO financial_records (
      project_id, recipient_type, recipient_id, 
      amount, description, bulan, tahun
    ) VALUES (
      NEW.project_id, 'pegawai', NEW.assignee_id,
      NEW.uang_transport, 'Uang transport untuk project', 
      project_month, project_year
    );
  END IF;

  -- Create financial record for mitra (honor)
  IF NEW.assignee_type = 'mitra' AND NEW.honor > 0 THEN
    INSERT INTO financial_records (
      project_id, recipient_type, recipient_id, 
      amount, description, bulan, tahun
    ) VALUES (
      NEW.project_id, 'mitra', NEW.assignee_id,
      NEW.honor, 'Honor mitra untuk project', 
      project_month, project_year
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_assignment_financial_record
  AFTER INSERT ON project_assignments
  FOR EACH ROW EXECUTE FUNCTION trigger_create_financial_record();

-- Trigger: Send notification when task is assigned
CREATE OR REPLACE FUNCTION trigger_task_notification()
RETURNS TRIGGER AS $$
DECLARE
  project_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get project name
    SELECT nama_project INTO project_name
    FROM projects WHERE id = NEW.project_id;
    
    -- Send notification to pegawai
    PERFORM create_notification(
      NEW.pegawai_id,
      'Task Baru Ditugaskan',
      'Anda mendapat task baru untuk project: ' || project_name,
      'info'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_assignment_notification
  AFTER INSERT ON tasks
  FOR EACH ROW EXECUTE FUNCTION trigger_task_notification();

-- Trigger: Send notification when task status changes
CREATE OR REPLACE FUNCTION trigger_task_status_notification()
RETURNS TRIGGER AS $$
DECLARE
  project_name TEXT;
  ketua_tim_id UUID;
  pegawai_name TEXT;
BEGIN
  IF OLD.status != NEW.status THEN
    -- Get project info
    SELECT p.nama_project, p.ketua_tim_id, u.nama_lengkap 
    INTO project_name, ketua_tim_id, pegawai_name
    FROM projects p
    JOIN users u ON NEW.pegawai_id = u.id
    WHERE p.id = NEW.project_id;
    
    -- Notify ketua tim about status change
    IF NEW.status = 'completed' THEN
      PERFORM create_notification(
        ketua_tim_id,
        'Task Diselesaikan',
        pegawai_name || ' telah menyelesaikan task di project: ' || project_name,
        'success'
      );
    ELSIF NEW.status = 'in_progress' THEN
      PERFORM create_notification(
        ketua_tim_id,
        'Task Dimulai',
        pegawai_name || ' telah memulai task di project: ' || project_name,
        'info'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_status_change_notification
  AFTER UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION trigger_task_status_notification();

-- Scheduled function to update project statuses (run daily)
-- This will be called by a cron job or scheduled task
CREATE OR REPLACE FUNCTION daily_project_status_update()
RETURNS VOID AS $$
BEGIN
  PERFORM update_project_status();
  
  -- Log the update
  RAISE NOTICE 'Project statuses updated at %', NOW();
END;
$$ LANGUAGE plpgsql;
-- Migration: Allow zero volume for tasks without transport
-- Date: 2024-12-19
-- Description: Remove volume constraints to allow tasks without transport (volume = 0)

-- Remove volume constraint from tasks table
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_volume_positive;

-- Remove volume constraint from task_transport_allocations table  
ALTER TABLE task_transport_allocations DROP CONSTRAINT IF EXISTS allocations_volume_positive;

-- Drop triggers that validate volume > 0
DROP TRIGGER IF EXISTS validate_tasks_satuan_data ON tasks;
DROP TRIGGER IF EXISTS validate_allocations_satuan_data ON task_transport_allocations;

-- Update the validation function to allow volume = 0
CREATE OR REPLACE FUNCTION validate_satuan_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate rate_per_satuan is not negative
  IF NEW.rate_per_satuan IS NOT NULL AND NEW.rate_per_satuan < 0 THEN
    RAISE EXCEPTION 'Rate per satuan tidak boleh negatif';
  END IF;
  
  -- Allow volume = 0 for tasks without transport
  IF NEW.volume IS NOT NULL AND NEW.volume < 0 THEN
    RAISE EXCEPTION 'Volume tidak boleh negatif';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers with updated validation
CREATE TRIGGER validate_tasks_satuan_data
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION validate_satuan_data();

CREATE TRIGGER validate_allocations_satuan_data
  BEFORE INSERT OR UPDATE ON task_transport_allocations
  FOR EACH ROW EXECUTE FUNCTION validate_satuan_data();

-- Add comment to clarify the change
COMMENT ON COLUMN tasks.volume IS 'Volume for satuan calculation. Can be 0 for tasks without transport.';
COMMENT ON COLUMN task_transport_allocations.volume IS 'Volume for allocation calculation. Can be 0 for tasks without transport.';

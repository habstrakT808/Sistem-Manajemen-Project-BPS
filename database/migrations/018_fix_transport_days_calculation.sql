-- Migration: Fix transport_days calculation for existing tasks
-- File: 018_fix_transport_days_calculation.sql

-- Update all tasks with transport to have correct transport_days calculation
-- This ensures that tasks with has_transport = true have proper transport_days value
UPDATE tasks 
SET transport_days = CASE 
  WHEN has_transport = true AND start_date IS NOT NULL AND end_date IS NOT NULL THEN
    GREATEST(1, (end_date::date - start_date::date) + 1)
  WHEN has_transport = true AND start_date IS NOT NULL AND end_date IS NULL THEN
    1 -- Default to 1 day if end_date is missing
  WHEN has_transport = true AND start_date IS NULL AND end_date IS NOT NULL THEN
    1 -- Default to 1 day if start_date is missing
  WHEN has_transport = true AND start_date IS NULL AND end_date IS NULL THEN
    1 -- Default to 1 day if both dates are missing
  ELSE 0
END;

-- Ensure all tasks without transport have transport_days = 0
UPDATE tasks 
SET transport_days = 0 
WHERE has_transport = false OR has_transport IS NULL;

-- Add index for better performance on transport_days queries
CREATE INDEX IF NOT EXISTS idx_tasks_transport_days ON tasks(transport_days);
CREATE INDEX IF NOT EXISTS idx_tasks_has_transport ON tasks(has_transport);

-- Verify the update by showing some statistics
DO $$
DECLARE
    total_tasks INTEGER;
    transport_tasks INTEGER;
    zero_transport_days INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_tasks FROM tasks;
    SELECT COUNT(*) INTO transport_tasks FROM tasks WHERE has_transport = true;
    SELECT COUNT(*) INTO zero_transport_days FROM tasks WHERE has_transport = true AND transport_days = 0;
    
    RAISE NOTICE 'Transport Days Fix Summary:';
    RAISE NOTICE 'Total tasks: %', total_tasks;
    RAISE NOTICE 'Tasks with transport: %', transport_tasks;
    RAISE NOTICE 'Transport tasks with 0 days (should be 0): %', zero_transport_days;
END $$;
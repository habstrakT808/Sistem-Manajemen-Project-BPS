-- Migration: Add transport_days column to tasks table
-- File: 017_add_transport_days_column.sql

-- Add transport_days column to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS transport_days INTEGER DEFAULT 0;

-- Update existing tasks to have transport_days based on their current transport allocation
-- For tasks that have transport, calculate days from start_date and end_date
UPDATE tasks 
SET transport_days = CASE 
  WHEN has_transport = true AND start_date IS NOT NULL AND end_date IS NOT NULL THEN
    GREATEST(1, (end_date::date - start_date::date) + 1)
  ELSE 0
END
WHERE transport_days = 0;

-- Add comment to the column
COMMENT ON COLUMN tasks.transport_days IS 'Number of transport days allocated for this task';
-- Migration: Fix transport allocations to allow multiple allocations per task
-- File: 019_fix_transport_multiple_allocations.sql

-- Remove the UNIQUE constraint on task_id to allow multiple transport allocations per task
-- This is needed because a task with transport_days > 1 should have multiple allocations
ALTER TABLE task_transport_allocations 
DROP CONSTRAINT IF EXISTS task_transport_allocations_task_id_key;

-- Add a comment explaining the change
COMMENT ON TABLE task_transport_allocations IS 'Transport allocations for tasks. Multiple allocations per task are allowed based on transport_days.';

-- Verify the constraint has been removed
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'task_transport_allocations' 
        AND constraint_name = 'task_transport_allocations_task_id_key'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        RAISE NOTICE 'WARNING: UNIQUE constraint on task_id still exists!';
    ELSE
        RAISE NOTICE 'SUCCESS: UNIQUE constraint on task_id has been removed. Multiple transport allocations per task are now allowed.';
    END IF;
END $$;
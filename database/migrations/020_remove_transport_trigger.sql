-- Migration: Remove transport allocation trigger to prevent duplication
-- File: 020_remove_transport_trigger.sql

-- The trigger was causing duplication because:
-- 1. Database trigger creates 1 allocation when has_transport = true
-- 2. API route creates transport_days allocations manually
-- Result: For 3 transport_days, we get 1 + 3 = 4 allocations instead of 3

-- Drop the trigger that auto-creates transport allocations
DROP TRIGGER IF EXISTS task_transport_allocation_trigger ON tasks;

-- Drop the trigger function
DROP FUNCTION IF EXISTS trigger_task_transport_allocation();

-- Add comment explaining the change
COMMENT ON TABLE task_transport_allocations IS 'Transport allocations for tasks. Allocations are now created manually via API based on transport_days value.';

-- Verify the trigger has been removed
DO $$
DECLARE
    trigger_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.triggers 
        WHERE trigger_name = 'task_transport_allocation_trigger'
        AND event_object_table = 'tasks'
    ) INTO trigger_exists;
    
    IF trigger_exists THEN
        RAISE NOTICE 'WARNING: Transport allocation trigger still exists!';
    ELSE
        RAISE NOTICE 'SUCCESS: Transport allocation trigger has been removed. No more automatic allocation creation.';
    END IF;
END $$;
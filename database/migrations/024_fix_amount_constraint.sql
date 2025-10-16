-- Migration: Fix amount constraint for satuan system
-- File: 024_fix_amount_constraint.sql

-- Remove the strict amount constraint that only allows 150000
ALTER TABLE task_transport_allocations 
DROP CONSTRAINT IF EXISTS task_transport_allocations_amount_check;

-- Add a more flexible constraint that allows any positive amount
ALTER TABLE task_transport_allocations 
ADD CONSTRAINT task_transport_allocations_amount_positive 
CHECK (amount > 0);

-- Update the amount column to allow any positive integer
ALTER TABLE task_transport_allocations 
ALTER COLUMN amount DROP DEFAULT;

-- Add a comment explaining the change
COMMENT ON COLUMN task_transport_allocations.amount IS 'Transport amount in IDR. Can be any positive value for satuan system.';

-- Verify the constraint has been updated
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'task_transport_allocations' 
        AND constraint_name = 'task_transport_allocations_amount_check'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        RAISE NOTICE 'WARNING: Old amount constraint still exists!';
    ELSE
        RAISE NOTICE 'SUCCESS: Amount constraint has been updated to allow any positive value.';
    END IF;
END $$;

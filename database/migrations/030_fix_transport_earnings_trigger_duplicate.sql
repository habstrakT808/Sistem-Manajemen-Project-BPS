-- File: database/migrations/030_fix_transport_earnings_trigger_duplicate.sql
-- Fix trigger_transport_earnings to handle duplicate earnings_ledger entries
-- When allocation_date is set/changed, use UPSERT instead of INSERT to avoid unique constraint violation

-- Function: Update earnings when transport allocation date is set
CREATE OR REPLACE FUNCTION trigger_transport_earnings()
RETURNS TRIGGER AS $$
BEGIN
  -- When allocation_date is set, create or update earnings entry
  IF NEW.allocation_date IS NOT NULL AND OLD.allocation_date IS NULL THEN
    INSERT INTO earnings_ledger (
      user_id, type, source_table, source_id, amount, occurred_on
    ) VALUES (
      NEW.user_id, 'transport', 'task_transport_allocations', NEW.id, NEW.amount, NEW.allocation_date
    )
    ON CONFLICT (type, source_table, source_id) 
    DO UPDATE SET
      user_id = NEW.user_id,
      amount = NEW.amount,
      occurred_on = NEW.allocation_date,
      posted_at = NOW();
    
    NEW.allocated_at = NOW();
  END IF;

  -- When allocation_date is changed, update earnings
  IF NEW.allocation_date IS NOT NULL AND OLD.allocation_date IS NOT NULL AND NEW.allocation_date != OLD.allocation_date THEN
    INSERT INTO earnings_ledger (
      user_id, type, source_table, source_id, amount, occurred_on
    ) VALUES (
      NEW.user_id, 'transport', 'task_transport_allocations', NEW.id, NEW.amount, NEW.allocation_date
    )
    ON CONFLICT (type, source_table, source_id)
    DO UPDATE SET
      user_id = NEW.user_id,
      amount = NEW.amount,
      occurred_on = NEW.allocation_date,
      posted_at = NOW();
  END IF;

  -- When allocation_date is cleared (set to NULL), delete earnings entry
  IF NEW.allocation_date IS NULL AND OLD.allocation_date IS NOT NULL THEN
    DELETE FROM earnings_ledger
    WHERE type = 'transport'
      AND source_table = 'task_transport_allocations'
      AND source_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


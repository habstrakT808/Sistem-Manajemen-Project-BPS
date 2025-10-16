-- Migration: Complete Satuan System Implementation
-- Description: Comprehensive migration for satuan-based honor/transport system
-- Author: System
-- Date: 2024-10-16
-- Version: 1.0

/*
SATUAN SYSTEM OVERVIEW
======================
This migration implements a flexible satuan-based system to replace the fixed 
150,000 transport rate with a configurable rate-per-unit system.

Key Features:
- Master satuan table with predefined types (O-B, O-K, Segmen, etc.)
- Flexible rate per satuan (replaces fixed 150,000)
- Volume-based calculations (replaces transport_days)
- Auto-calculated total amounts
- Backward compatibility with existing data
- Analytics and reporting functions
- Data validation and integrity triggers

Usage:
- Rate Per Satuan × Volume = Total Amount
- Supports different unit types for different project needs
- Admin can manage satuan types via /admin/satuan
- Ketua Tim can select satuan when creating tasks
*/

-- ============================================================================
-- 1. CREATE SATUAN MASTER TABLE
-- ============================================================================

-- Create satuan_master table
CREATE TABLE satuan_master (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama_satuan VARCHAR(100) NOT NULL UNIQUE,
  deskripsi TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default satuan values
INSERT INTO satuan_master (nama_satuan, deskripsi) VALUES
('O-B', 'Operasional Biasa'),
('O-K', 'Operasional Khusus'),
('Segmen', 'Segmen'),
('BS', 'Badan Statistik'),
('SLS', 'Sensus Longitudinal'),
('Desa', 'Desa'),
('Kegiatan', 'Kegiatan'),
('Publikasi', 'Publikasi');

-- Add RLS policies for satuan_master
ALTER TABLE satuan_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users" ON satuan_master
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for admin users" ON satuan_master
  FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  ));

CREATE POLICY "Enable update for admin users" ON satuan_master
  FOR UPDATE USING (auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  ));

CREATE POLICY "Enable delete for admin users" ON satuan_master
  FOR DELETE USING (auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  ));

-- ============================================================================
-- 2. UPDATE TASKS TABLE
-- ============================================================================

-- Add new columns to tasks table for satuan system
ALTER TABLE tasks ADD COLUMN satuan_id UUID REFERENCES satuan_master(id);
ALTER TABLE tasks ADD COLUMN rate_per_satuan DECIMAL(12,2) DEFAULT 0;
ALTER TABLE tasks ADD COLUMN volume INTEGER DEFAULT 1;
ALTER TABLE tasks ADD COLUMN total_amount DECIMAL(12,2) GENERATED ALWAYS AS (rate_per_satuan * volume) STORED;

-- Add constraints for data integrity
ALTER TABLE tasks ADD CONSTRAINT tasks_volume_positive CHECK (volume > 0);
ALTER TABLE tasks ADD CONSTRAINT tasks_rate_non_negative CHECK (rate_per_satuan >= 0);

-- ============================================================================
-- 3. UPDATE TASK_TRANSPORT_ALLOCATIONS TABLE
-- ============================================================================

-- Add new columns to task_transport_allocations table for satuan system
ALTER TABLE task_transport_allocations ADD COLUMN satuan_id UUID REFERENCES satuan_master(id);
ALTER TABLE task_transport_allocations ADD COLUMN rate_per_satuan DECIMAL(12,2) DEFAULT 0;
ALTER TABLE task_transport_allocations ADD COLUMN volume INTEGER DEFAULT 1;
ALTER TABLE task_transport_allocations ADD COLUMN total_amount DECIMAL(12,2) GENERATED ALWAYS AS (rate_per_satuan * volume) STORED;

-- Add constraints for data integrity
ALTER TABLE task_transport_allocations ADD CONSTRAINT allocations_volume_positive CHECK (volume > 0);
ALTER TABLE task_transport_allocations ADD CONSTRAINT allocations_rate_non_negative CHECK (rate_per_satuan >= 0);

-- ============================================================================
-- 4. MIGRATE EXISTING DATA
-- ============================================================================

-- Update existing tasks with default values
UPDATE tasks SET 
  satuan_id = (SELECT id FROM satuan_master WHERE nama_satuan = 'Kegiatan' LIMIT 1),
  rate_per_satuan = 150000,
  volume = 1
WHERE satuan_id IS NULL;

-- Update existing allocations with default values
UPDATE task_transport_allocations SET 
  satuan_id = (SELECT id FROM satuan_master WHERE nama_satuan = 'Kegiatan' LIMIT 1),
  rate_per_satuan = 150000,
  volume = 1
WHERE satuan_id IS NULL;

-- ============================================================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Create indexes for better performance
CREATE INDEX idx_tasks_satuan_id ON tasks(satuan_id);
CREATE INDEX idx_tasks_total_amount ON tasks(total_amount);
CREATE INDEX idx_allocations_satuan_id ON task_transport_allocations(satuan_id);
CREATE INDEX idx_allocations_total_amount ON task_transport_allocations(total_amount);

-- ============================================================================
-- 6. FINANCIAL CALCULATION FUNCTIONS
-- ============================================================================

-- Function to calculate project budget using new satuan system
CREATE OR REPLACE FUNCTION calculate_project_budget_satuan(project_id_param UUID)
RETURNS DECIMAL(12,2) AS $$
DECLARE
  total_budget DECIMAL(12,2) := 0;
  task_record RECORD;
BEGIN
  -- Calculate budget from tasks using new satuan system
  FOR task_record IN 
    SELECT 
      t.id,
      t.rate_per_satuan,
      t.volume,
      t.total_amount,
      t.assignee_type,
      t.assignee_user_id,
      t.assignee_mitra_id
    FROM tasks t
    WHERE t.project_id = project_id_param
  LOOP
    -- Use total_amount if available (new system), otherwise fallback to old calculation
    IF task_record.total_amount IS NOT NULL AND task_record.total_amount > 0 THEN
      total_budget := total_budget + task_record.total_amount;
    ELSE
      -- Fallback to old system for backward compatibility
      IF task_record.assignee_type = 'member' THEN
        -- For members, use transport calculation (150,000 per day)
        total_budget := total_budget + (150000 * COALESCE(task_record.volume, 1));
      ELSIF task_record.assignee_type = 'mitra' THEN
        -- For mitra, use honor amount
        total_budget := total_budget + COALESCE(task_record.rate_per_satuan, 0);
      END IF;
    END IF;
  END LOOP;
  
  RETURN total_budget;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate transport budget using new satuan system
CREATE OR REPLACE FUNCTION calculate_transport_budget_satuan(project_id_param UUID)
RETURNS DECIMAL(12,2) AS $$
DECLARE
  transport_budget DECIMAL(12,2) := 0;
  task_record RECORD;
BEGIN
  -- Calculate transport budget from tasks using new satuan system
  FOR task_record IN 
    SELECT 
      t.id,
      t.rate_per_satuan,
      t.volume,
      t.total_amount,
      t.assignee_type
    FROM tasks t
    WHERE t.project_id = project_id_param
      AND t.assignee_type = 'member'
  LOOP
    -- Use total_amount if available (new system), otherwise fallback to old calculation
    IF task_record.total_amount IS NOT NULL AND task_record.total_amount > 0 THEN
      transport_budget := transport_budget + task_record.total_amount;
    ELSE
      -- Fallback to old system for backward compatibility
      transport_budget := transport_budget + (150000 * COALESCE(task_record.volume, 1));
    END IF;
  END LOOP;
  
  RETURN transport_budget;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate honor budget using new satuan system
CREATE OR REPLACE FUNCTION calculate_honor_budget_satuan(project_id_param UUID)
RETURNS DECIMAL(12,2) AS $$
DECLARE
  honor_budget DECIMAL(12,2) := 0;
  task_record RECORD;
BEGIN
  -- Calculate honor budget from tasks using new satuan system
  FOR task_record IN 
    SELECT 
      t.id,
      t.rate_per_satuan,
      t.volume,
      t.total_amount,
      t.assignee_type
    FROM tasks t
    WHERE t.project_id = project_id_param
      AND t.assignee_type = 'mitra'
  LOOP
    -- Use total_amount if available (new system), otherwise fallback to old calculation
    IF task_record.total_amount IS NOT NULL AND task_record.total_amount > 0 THEN
      honor_budget := honor_budget + task_record.total_amount;
    ELSE
      -- Fallback to old system for backward compatibility
      honor_budget := honor_budget + COALESCE(task_record.rate_per_satuan, 0);
    END IF;
  END LOOP;
  
  RETURN honor_budget;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. ANALYTICS FUNCTIONS
-- ============================================================================

-- Function to get satuan usage statistics
CREATE OR REPLACE FUNCTION get_satuan_usage_stats()
RETURNS TABLE (
  satuan_id UUID,
  nama_satuan VARCHAR(100),
  total_tasks BIGINT,
  total_allocations BIGINT,
  total_amount DECIMAL(12,2),
  average_rate DECIMAL(12,2),
  average_volume DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sm.id as satuan_id,
    sm.nama_satuan,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT ta.id) as total_allocations,
    COALESCE(SUM(COALESCE(t.total_amount, 0)), 0) as total_amount,
    COALESCE(AVG(t.rate_per_satuan), 0) as average_rate,
    COALESCE(AVG(t.volume), 0) as average_volume
  FROM satuan_master sm
  LEFT JOIN tasks t ON sm.id = t.satuan_id
  LEFT JOIN task_transport_allocations ta ON sm.id = ta.satuan_id
  WHERE sm.is_active = true
  GROUP BY sm.id, sm.nama_satuan
  ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get satuan performance by project
CREATE OR REPLACE FUNCTION get_satuan_performance_by_project(project_id_param UUID)
RETURNS TABLE (
  satuan_id UUID,
  nama_satuan VARCHAR(100),
  total_tasks BIGINT,
  total_amount DECIMAL(12,2),
  average_rate DECIMAL(12,2),
  average_volume DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sm.id as satuan_id,
    sm.nama_satuan,
    COUNT(t.id) as total_tasks,
    COALESCE(SUM(COALESCE(t.total_amount, 0)), 0) as total_amount,
    COALESCE(AVG(t.rate_per_satuan), 0) as average_rate,
    COALESCE(AVG(t.volume), 0) as average_volume
  FROM satuan_master sm
  LEFT JOIN tasks t ON sm.id = t.satuan_id AND t.project_id = project_id_param
  WHERE sm.is_active = true
  GROUP BY sm.id, sm.nama_satuan
  HAVING COUNT(t.id) > 0
  ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. VALIDATION TRIGGERS
-- ============================================================================

-- Function to validate satuan data before insert/update
CREATE OR REPLACE FUNCTION validate_satuan_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate that satuan_id exists and is active
  IF NEW.satuan_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM satuan_master 
      WHERE id = NEW.satuan_id AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Satuan dengan ID % tidak ditemukan atau tidak aktif', NEW.satuan_id;
    END IF;
  END IF;
  
  -- Validate rate_per_satuan is not negative
  IF NEW.rate_per_satuan IS NOT NULL AND NEW.rate_per_satuan < 0 THEN
    RAISE EXCEPTION 'Rate per satuan tidak boleh negatif';
  END IF;
  
  -- Validate volume is positive
  IF NEW.volume IS NOT NULL AND NEW.volume <= 0 THEN
    RAISE EXCEPTION 'Volume harus lebih dari 0';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for data validation
CREATE TRIGGER validate_tasks_satuan_data
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION validate_satuan_data();

CREATE TRIGGER validate_allocations_satuan_data
  BEFORE INSERT OR UPDATE ON task_transport_allocations
  FOR EACH ROW EXECUTE FUNCTION validate_satuan_data();

-- ============================================================================
-- 9. MIGRATION HELPER FUNCTIONS
-- ============================================================================

-- Function to validate migration results
CREATE OR REPLACE FUNCTION validate_satuan_migration()
RETURNS TABLE (
  table_name TEXT,
  total_records BIGINT,
  migrated_records BIGINT,
  unmigrated_records BIGINT,
  migration_success BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'tasks'::TEXT as table_name,
    COUNT(*)::BIGINT as total_records,
    COUNT(CASE WHEN satuan_id IS NOT NULL THEN 1 END)::BIGINT as migrated_records,
    COUNT(CASE WHEN satuan_id IS NULL THEN 1 END)::BIGINT as unmigrated_records,
    (COUNT(CASE WHEN satuan_id IS NULL THEN 1 END) = 0) as migration_success
  FROM tasks
  
  UNION ALL
  
  SELECT 
    'task_transport_allocations'::TEXT as table_name,
    COUNT(*)::BIGINT as total_records,
    COUNT(CASE WHEN satuan_id IS NOT NULL THEN 1 END)::BIGINT as migrated_records,
    COUNT(CASE WHEN satuan_id IS NULL THEN 1 END)::BIGINT as unmigrated_records,
    (COUNT(CASE WHEN satuan_id IS NULL THEN 1 END) = 0) as migration_success
  FROM task_transport_allocations;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. DOCUMENTATION AND COMMENTS
-- ============================================================================

-- Add comprehensive comments for documentation
COMMENT ON TABLE satuan_master IS 'Master table for satuan (unit types) used in task honor and transport calculations';
COMMENT ON COLUMN satuan_master.id IS 'Unique identifier for satuan';
COMMENT ON COLUMN satuan_master.nama_satuan IS 'Name of the satuan (e.g., O-B, O-K, Segmen)';
COMMENT ON COLUMN satuan_master.deskripsi IS 'Description of the satuan';
COMMENT ON COLUMN satuan_master.is_active IS 'Whether the satuan is active and can be used';
COMMENT ON COLUMN satuan_master.created_at IS 'Timestamp when the satuan was created';
COMMENT ON COLUMN satuan_master.updated_at IS 'Timestamp when the satuan was last updated';

COMMENT ON COLUMN tasks.satuan_id IS 'Reference to satuan_master table - defines the unit type for this task';
COMMENT ON COLUMN tasks.rate_per_satuan IS 'Rate per unit for this task (replaces fixed 150,000 rate)';
COMMENT ON COLUMN tasks.volume IS 'Number of units/volume for this task (replaces transport_days)';
COMMENT ON COLUMN tasks.total_amount IS 'Calculated total amount (rate_per_satuan * volume) - auto-generated column';

COMMENT ON COLUMN task_transport_allocations.satuan_id IS 'Reference to satuan_master table - defines the unit type for this allocation';
COMMENT ON COLUMN task_transport_allocations.rate_per_satuan IS 'Rate per unit for this allocation (replaces fixed amount)';
COMMENT ON COLUMN task_transport_allocations.volume IS 'Number of units/volume for this allocation';
COMMENT ON COLUMN task_transport_allocations.total_amount IS 'Calculated total amount (rate_per_satuan * volume) - auto-generated column';

COMMENT ON FUNCTION calculate_project_budget_satuan(UUID) IS 'Calculate total project budget using new satuan system with backward compatibility';
COMMENT ON FUNCTION calculate_transport_budget_satuan(UUID) IS 'Calculate transport budget using new satuan system with backward compatibility';
COMMENT ON FUNCTION calculate_honor_budget_satuan(UUID) IS 'Calculate honor budget using new satuan system with backward compatibility';
COMMENT ON FUNCTION get_satuan_usage_stats() IS 'Get comprehensive usage statistics for all satuan types';
COMMENT ON FUNCTION get_satuan_performance_by_project(UUID) IS 'Get satuan performance statistics for a specific project';
COMMENT ON FUNCTION validate_satuan_data() IS 'Validates satuan data integrity before insert/update operations';
COMMENT ON FUNCTION validate_satuan_migration() IS 'Validates the results of satuan system migration';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

/*
MIGRATION SUMMARY:
==================
✅ Created satuan_master table with default values
✅ Updated tasks table with satuan fields
✅ Updated task_transport_allocations table with satuan fields
✅ Migrated existing data with default values
✅ Created performance indexes
✅ Implemented financial calculation functions
✅ Added analytics and reporting functions
✅ Created data validation triggers
✅ Added comprehensive documentation

NEXT STEPS:
===========
1. Run this migration in your database
2. Test the migration with: SELECT * FROM validate_satuan_migration();
3. Access admin panel at /admin/satuan to manage satuan types
4. Create tasks with new satuan system
5. Monitor performance with analytics functions

USAGE EXAMPLES:
===============
-- Get satuan usage statistics
SELECT * FROM get_satuan_usage_stats();

-- Calculate project budget
SELECT calculate_project_budget_satuan('your-project-id');

-- Get project-specific satuan performance
SELECT * FROM get_satuan_performance_by_project('your-project-id');
*/

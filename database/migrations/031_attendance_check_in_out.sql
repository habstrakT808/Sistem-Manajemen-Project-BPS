-- Migration: 031_attendance_check_in_out.sql
-- Create attendance_logs table for check-in/check-out monitoring

-- Create attendance_logs table
CREATE TABLE IF NOT EXISTS attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  check_in_at TIMESTAMPTZ NOT NULL,
  check_out_at TIMESTAMPTZ,
  check_out_reason TEXT,
  date DATE NOT NULL, -- Date of the attendance (YYYY-MM-DD)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one check-in per user per day (but can have multiple check-in/out cycles)
  -- Actually, we'll allow multiple entries per day for multiple check-in/out cycles
  CONSTRAINT valid_checkout CHECK (
    check_out_at IS NULL OR check_out_at >= check_in_at
  )
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_attendance_logs_user_id ON attendance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_date ON attendance_logs(date);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_user_date ON attendance_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_check_in_at ON attendance_logs(check_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_check_out_at ON attendance_logs(check_out_at DESC);

-- Enable RLS
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own attendance logs
CREATE POLICY "Users can view own attendance logs"
  ON attendance_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own attendance logs
CREATE POLICY "Users can insert own attendance logs"
  ON attendance_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own attendance logs (for checkout)
CREATE POLICY "Users can update own attendance logs"
  ON attendance_logs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all attendance logs
CREATE POLICY "Admins can view all attendance logs"
  ON attendance_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Ketua tim can view attendance logs of their team members
CREATE POLICY "Ketua tim can view team attendance logs"
  ON attendance_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u1
      INNER JOIN projects p ON p.leader_user_id = u1.id
      INNER JOIN project_members pm ON pm.project_id = p.id
      WHERE u1.id = auth.uid()
      AND u1.role = 'ketua_tim'
      AND pm.user_id = attendance_logs.user_id
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_attendance_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER attendance_logs_updated_at
  BEFORE UPDATE ON attendance_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_attendance_logs_updated_at();

-- Comments
COMMENT ON TABLE attendance_logs IS 'Stores check-in and check-out logs for employees';
COMMENT ON COLUMN attendance_logs.user_id IS 'Reference to the user/employee';
COMMENT ON COLUMN attendance_logs.check_in_at IS 'Timestamp when user checked in';
COMMENT ON COLUMN attendance_logs.check_out_at IS 'Timestamp when user checked out (nullable)';
COMMENT ON COLUMN attendance_logs.check_out_reason IS 'Reason for checkout (required when checking out)';
COMMENT ON COLUMN attendance_logs.date IS 'Date of the attendance record (YYYY-MM-DD)';


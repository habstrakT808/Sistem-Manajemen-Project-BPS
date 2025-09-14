-- File: database/migrations/007_system_settings.sql

-- Create system_settings table
CREATE TABLE system_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  config JSONB NOT NULL DEFAULT '{}',
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure only one settings row
  CONSTRAINT single_settings_row CHECK (id = 1)
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage system settings" ON system_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Create index
CREATE INDEX idx_system_settings_updated_at ON system_settings(updated_at);

-- Insert default settings
INSERT INTO system_settings (id, config) VALUES (
  1,
  '{
    "financial": {
      "mitra_monthly_limit": 3300000,
      "default_transport_amount": 50000,
      "currency_locale": "id-ID"
    },
    "workload": {
      "low_threshold": 2,
      "medium_threshold": 4,
      "high_threshold": 6
    },
    "notifications": {
      "email_enabled": true,
      "task_deadline_reminder": true,
      "project_deadline_reminder": true,
      "financial_limit_warning": true,
      "system_maintenance_notice": true
    },
    "system": {
      "auto_project_status_update": true,
      "data_retention_days": 365,
      "backup_frequency": "daily",
      "maintenance_mode": false
    },
    "security": {
      "session_timeout_minutes": 480,
      "password_min_length": 8,
      "require_password_change_days": 90,
      "max_login_attempts": 5
    }
  }'::jsonb
);
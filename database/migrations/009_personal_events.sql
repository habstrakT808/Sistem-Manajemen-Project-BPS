-- File: database/migrations/009_personal_events.sql

-- Create personal_events table
CREATE TABLE personal_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  event_type TEXT DEFAULT 'personal' CHECK (event_type IN ('personal', 'task', 'project', 'meeting')),
  related_id UUID, -- task_id atau project_id
  color TEXT DEFAULT '#22c55e', -- Default green color
  is_all_day BOOLEAN DEFAULT false,
  reminder_minutes INTEGER DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE personal_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own events" ON personal_events
  FOR ALL USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_personal_events_user_id ON personal_events(user_id);
CREATE INDEX idx_personal_events_date_range ON personal_events(start_date, end_date);
CREATE INDEX idx_personal_events_type ON personal_events(event_type);
CREATE INDEX idx_personal_events_related_id ON personal_events(related_id);

-- Updated_at trigger
CREATE TRIGGER update_personal_events_updated_at BEFORE UPDATE ON personal_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get workload indicator for date range
CREATE OR REPLACE FUNCTION get_workload_indicator(
  user_id_param UUID,
  start_date_param DATE,
  end_date_param DATE
)
RETURNS TABLE (
  date DATE,
  workload_level TEXT,
  event_count INTEGER,
  task_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(start_date_param, end_date_param, '1 day'::INTERVAL)::DATE as date
  ),
  daily_counts AS (
    SELECT 
      ds.date,
      -- Count personal events
      COALESCE(COUNT(pe.id), 0) as event_count,
      -- Count tasks
      COALESCE(COUNT(t.id), 0) as task_count
    FROM date_series ds
    LEFT JOIN personal_events pe ON (
      pe.user_id = user_id_param
      AND ds.date BETWEEN pe.start_date::DATE AND pe.end_date::DATE
    )
    LEFT JOIN tasks t ON (
      t.pegawai_id = user_id_param
      AND t.tanggal_tugas = ds.date
    )
    GROUP BY ds.date
  )
  SELECT 
    dc.date,
    CASE 
      WHEN (dc.event_count + dc.task_count) <= 2 THEN 'low'
      WHEN (dc.event_count + dc.task_count) <= 4 THEN 'medium'
      ELSE 'high'
    END as workload_level,
    dc.event_count::INTEGER,
    dc.task_count::INTEGER
  FROM daily_counts dc
  ORDER BY dc.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
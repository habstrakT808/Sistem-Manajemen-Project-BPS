-- 1) Buat tabel catatan transport
CREATE TABLE IF NOT EXISTS transport_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_id uuid REFERENCES task_transport_allocations(id) ON DELETE CASCADE,
  date date,
  project_id uuid,
  task_id uuid,
  note text NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) Indeks dan kebijakan (opsional, jika pakai RLS)
CREATE INDEX IF NOT EXISTS idx_transport_notes_allocation ON transport_notes(allocation_id);
CREATE INDEX IF NOT EXISTS idx_transport_notes_date ON transport_notes(date);

-- Jika ingin RLS:
ALTER TABLE transport_notes ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY transport_notes_admin_all ON transport_notes
  FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Pemilik alokasi (pegawai) dapat melihat catatan yang terkait dengan alokasi miliknya
CREATE POLICY transport_notes_user_select ON transport_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM task_transport_allocations a
      WHERE a.id = transport_notes.allocation_id
        AND a.user_id = auth.uid()
    )
  );

-- Pegawai dapat menulis catatan untuk alokasinya sendiri
CREATE POLICY transport_notes_user_insert ON transport_notes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM task_transport_allocations a
      WHERE a.id = transport_notes.allocation_id
        AND a.user_id = auth.uid()
    )
  );

-- Pegawai hanya boleh update catatan yang dia buat sendiri (opsional)
CREATE POLICY transport_notes_user_update_own ON transport_notes
  FOR UPDATE USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
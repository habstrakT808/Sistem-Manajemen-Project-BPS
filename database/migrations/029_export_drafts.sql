-- 028_export_drafts.sql

-- 1) Pastikan extension uuid/pgcrypto tersedia (kalau belum)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2) Tabel draft surat
CREATE TABLE IF NOT EXISTS export_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,             -- contoh: 'sk-tim'
  data jsonb NOT NULL,            -- payload draft (form data)
  user_id uuid,                   -- opsional: id pembuat (jika perlu)
  created_at timestamptz DEFAULT now()
);

-- 3) Index
CREATE INDEX IF NOT EXISTS idx_export_drafts_type_created_at
  ON export_drafts(type, created_at DESC);

-- 4) Migrasikan data lama dari system_settings.config.saved_exports (jika ada)
DO $$
DECLARE
  v_cfg jsonb;
  v item;
BEGIN
  SELECT CASE
           WHEN jsonb_typeof(config) = 'object' THEN config
           WHEN jsonb_typeof(config) IS NULL THEN '{}'::jsonb
           ELSE config::jsonb
         END
  INTO v_cfg
  FROM system_settings
  WHERE id = 1;

  IF v_cfg ? 'saved_exports' THEN
    FOR v IN SELECT jsonb_array_elements(v_cfg->'saved_exports') LOOP
      INSERT INTO export_drafts (id, type, data, created_at)
      VALUES (
        COALESCE((v->>'id')::uuid, gen_random_uuid()),
        v->>'type',
        v->'data',
        COALESCE((v->>'created_at')::timestamptz, now())
      )
      ON CONFLICT (id) DO NOTHING;
    END LOOP;
  END IF;
END$$;
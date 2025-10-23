-- Migration: Add NIP (Nomor Induk Pegawai) column to users table
-- Date: 2024-12-19
-- Description: Add optional NIP field for users

-- Add NIP column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS nip VARCHAR(50);

-- Add comment to the column
COMMENT ON COLUMN users.nip IS 'Nomor Induk Pegawai - optional field for employee identification';

-- Create index for NIP for better search performance (optional)
CREATE INDEX IF NOT EXISTS idx_users_nip ON users(nip) WHERE nip IS NOT NULL;

-- Update RLS policies if needed (users table should already have proper RLS)
-- No additional RLS changes needed as this is just adding a column

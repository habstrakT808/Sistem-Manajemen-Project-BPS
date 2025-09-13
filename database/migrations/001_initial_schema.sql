-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'ketua_tim', 'pegawai');
CREATE TYPE project_status AS ENUM ('upcoming', 'active', 'completed');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE assignee_type AS ENUM ('pegawai', 'mitra');
CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error');

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL,
  nama_lengkap TEXT NOT NULL,
  no_telepon TEXT,
  alamat TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mitra table
CREATE TABLE mitra (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama_mitra TEXT NOT NULL,
  jenis TEXT CHECK (jenis IN ('perusahaan', 'individu')) NOT NULL,
  kontak TEXT,
  alamat TEXT,
  deskripsi TEXT,
  rating_average DECIMAL(3,2) DEFAULT 0.00 CHECK (rating_average >= 0 AND rating_average <= 5),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama_project TEXT NOT NULL,
  deskripsi TEXT NOT NULL,
  tanggal_mulai DATE NOT NULL,
  deadline DATE NOT NULL,
  ketua_tim_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status project_status DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_dates CHECK (deadline >= tanggal_mulai)
);

-- Project assignments table (many-to-many for projects and assignees)
CREATE TABLE project_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assignee_type assignee_type NOT NULL,
  assignee_id UUID NOT NULL,
  uang_transport DECIMAL(12,2) CHECK (uang_transport >= 0),
  honor DECIMAL(12,2) CHECK (honor >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate assignments
  UNIQUE(project_id, assignee_type, assignee_id)
);

-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pegawai_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tanggal_tugas DATE NOT NULL,
  deskripsi_tugas TEXT NOT NULL,
  status task_status DEFAULT 'pending',
  response_pegawai TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mitra reviews table
CREATE TABLE mitra_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  mitra_id UUID NOT NULL REFERENCES mitra(id) ON DELETE CASCADE,
  pegawai_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  komentar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate reviews
  UNIQUE(project_id, mitra_id, pegawai_id)
);

-- Financial records table
CREATE TABLE financial_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  recipient_type assignee_type NOT NULL,
  recipient_id UUID NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  description TEXT NOT NULL,
  bulan INTEGER NOT NULL CHECK (bulan >= 1 AND bulan <= 12),
  tahun INTEGER NOT NULL CHECK (tahun >= 2020),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type notification_type DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_projects_ketua_tim_id ON projects(ketua_tim_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_dates ON projects(tanggal_mulai, deadline);
CREATE INDEX idx_project_assignments_project_id ON project_assignments(project_id);
CREATE INDEX idx_project_assignments_assignee ON project_assignments(assignee_type, assignee_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_pegawai_id ON tasks(pegawai_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_tanggal_tugas ON tasks(tanggal_tugas);
CREATE INDEX idx_mitra_reviews_mitra_id ON mitra_reviews(mitra_id);
CREATE INDEX idx_financial_records_recipient ON financial_records(recipient_type, recipient_id);
CREATE INDEX idx_financial_records_date ON financial_records(bulan, tahun);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mitra_updated_at BEFORE UPDATE ON mitra
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
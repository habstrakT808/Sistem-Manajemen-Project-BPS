// Supabase type definitions for better type safety
export interface TaskUpdateData {
  title?: string;
  deskripsi_tugas?: string;
  start_date?: string;
  end_date?: string;
  tanggal_tugas?: string; // Backward compatibility
  status?: "pending" | "in_progress" | "completed";
  has_transport?: boolean;
  response_pegawai?: string;
  updated_at?: string;
}

export interface TransportAllocationUpdateData {
  allocation_date?: string;
  allocated_at?: string;
  canceled_at?: string;
}

export interface TeamInsertData {
  name: string;
  description?: string;
  leader_user_id?: string;
  created_by: string;
}

export interface AuditLogInsertData {
  actor_user_id: string;
  action: string;
  entity: string;
  entity_id: string;
  before_data?: Record<string, unknown>;
  after_data?: Record<string, unknown>;
}

export interface UserProfile {
  id: string;
  email: string;
  nama_lengkap: string;
  role: "admin" | "ketua_tim" | "pegawai";
  nip?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskData {
  id: string;
  project_id: string;
  assignee_user_id: string;
  title: string;
  deskripsi_tugas?: string;
  start_date: string;
  end_date: string;
  status: "pending" | "in_progress" | "completed";
  has_transport: boolean;
  response_pegawai?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectData {
  id: string;
  nama_project: string;
  deskripsi?: string;
  status: "active" | "completed" | "cancelled";
  start_date: string;
  end_date: string;
  leader_user_id: string;
  team_id?: string;
  created_at: string;
  updated_at: string;
}

export interface EarningsData {
  id: string;
  user_id: string;
  type: "transport" | "honor" | "bonus";
  amount: number;
  description: string;
  occurred_on: string;
  posted_at: string;
  source_id?: string;
  created_at: string;
}

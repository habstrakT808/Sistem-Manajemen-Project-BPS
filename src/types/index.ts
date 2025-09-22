// File: src/types/index.ts
// COMPLETELY UPDATED: New types for major update

export type UserRole = "admin" | "ketua_tim" | "pegawai";
export type ProjectStatus = "upcoming" | "active" | "completed";
export type TaskStatus = "pending" | "in_progress" | "completed";
export type AssigneeType = "pegawai" | "mitra";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  nama_lengkap: string;
  no_telepon?: string;
  alamat?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  leader_user_id?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  leader?: User;
  project_count?: number;
  total_members?: number;
}

export interface Project {
  id: string;
  nama_project: string;
  deskripsi: string;
  tanggal_mulai: string;
  deadline: string;
  ketua_tim_id: string; // Keep for backward compatibility
  leader_user_id: string;
  team_id?: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  leader?: User;
  team?: Team;
  members?: ProjectMember[];
  assignments?: ProjectAssignment[];
  tasks?: Task[];
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: "leader" | "member";
  created_at: string;
  created_by?: string;
  user?: User;
  project?: Project;
}

export interface Task {
  id: string;
  project_id: string;
  assignee_user_id: string;
  pegawai_id: string; // Keep for backward compatibility
  title: string;
  deskripsi_tugas: string;
  start_date: string;
  end_date: string;
  tanggal_tugas: string; // Keep for backward compatibility
  has_transport: boolean;
  status: TaskStatus;
  response_pegawai?: string;
  created_at: string;
  updated_at: string;
  project?: Project;
  assignee?: User;
  transport_allocation?: TransportAllocation;
}

export interface TransportAllocation {
  id: string;
  task_id: string;
  user_id: string;
  amount: number;
  allocation_date?: string;
  allocated_at?: string;
  canceled_at?: string;
  created_at: string;
  created_by?: string;
  task?: Task;
  user?: User;
}

export interface EarningsLedger {
  id: string;
  user_id: string;
  type: "transport" | "honor" | "bonus";
  source_table: string;
  source_id: string;
  amount: number;
  currency: string;
  occurred_on: string;
  posted_at: string;
  created_by?: string;
  user?: User;
}

export interface AuditLog {
  id: string;
  actor_user_id?: string;
  action: string;
  entity: string;
  entity_id: string;
  before_data?: Record<string, unknown>;
  after_data?: Record<string, unknown>;
  created_at: string;
  actor?: User;
}

export interface Mitra {
  id: string;
  nama_mitra: string;
  jenis: "perusahaan" | "individu";
  kontak?: string;
  alamat?: string;
  deskripsi?: string;
  rating_average: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectAssignment {
  id: string;
  project_id: string;
  assignee_type: AssigneeType;
  assignee_id: string;
  uang_transport?: number;
  honor?: number;
  created_at: string;
  project?: Project;
  pegawai?: User;
  mitra?: Mitra;
}

export interface MitraReview {
  id: string;
  project_id: string;
  mitra_id: string;
  pegawai_id: string;
  rating: number;
  komentar?: string;
  created_at: string;
  project?: Project;
  mitra?: Mitra;
  pegawai?: User;
}

export interface FinancialRecord {
  id: string;
  project_id: string;
  recipient_type: AssigneeType;
  recipient_id: string;
  amount: number;
  description: string;
  bulan: number;
  tahun: number;
  created_at: string;
  project?: Project;
}

// Dashboard Types
export interface DashboardStats {
  totalUsers?: number;
  activeProjects?: number;
  completedProjects?: number;
  monthlySpending?: number;
  // Ketua Tim stats
  my_projects?: number;
  team_members?: number;
  pending_tasks?: number;
  monthly_budget?: number;
  // Pegawai stats
  assigned_projects?: number;
  active_tasks?: number;
  completed_tasks?: number;
  monthly_earnings?: number;
  pending_reviews?: number;
  pending_transport_allocations?: number;
}

export interface WorkloadIndicator {
  pegawai_id: string;
  nama_lengkap: string;
  project_count: number;
  workload_level: "low" | "medium" | "high";
}

// Form Types
export interface CreateTeamForm {
  name: string;
  description?: string;
  leader_user_id?: string;
}

export interface CreateProjectForm {
  nama_project: string;
  deskripsi: string;
  tanggal_mulai: string;
  deadline: string;
  team_id?: string;
  pegawai_assignments: {
    pegawai_id: string;
  }[];
  mitra_assignments: {
    mitra_id: string;
    honor: number;
  }[];
}

export interface CreateTaskForm {
  project_id: string;
  assignee_user_id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  has_transport: boolean;
}

export interface CreateUserForm {
  email: string;
  password: string;
  role: UserRole;
  nama_lengkap: string;
  no_telepon?: string;
  alamat?: string;
}

export interface TransportAllocationForm {
  task_id: string;
  allocation_date: string;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
  meta?: {
    timestamp: string;
    user_id?: string;
    request_id?: string;
    [key: string]: unknown;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  meta?: {
    timestamp: string;
    [key: string]: unknown;
  };
}

// Notification Types
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  is_read: boolean;
  created_at: string;
}

// Analytics Types
export interface TransportAnalytics {
  daily_transport: Array<{
    occurred_on: string;
    amount: number;
    user_id: string;
    users: { nama_lengkap: string };
    tasks: {
      title: string;
      projects: { nama_project: string };
    };
  }>;
  user_statistics: Array<{
    name: string;
    email: string;
    total: number;
    count: number;
  }>;
  project_statistics: Array<{
    name: string;
    total: number;
    count: number;
  }>;
  summary: {
    total_amount: number;
    total_allocations: number;
    unique_users: number;
    unique_projects: number;
  };
}

export interface FinancialAnalytics {
  monthly_spending: number;
  transport_spending: number;
  honor_spending: number;
  budget_utilization: number;
  spending_trends: Array<{
    month: string;
    transport: number;
    honor: number;
    total: number;
  }>;
  top_spenders: {
    pegawai: Array<{
      name: string;
      amount: number;
      projects: number;
    }>;
    mitra: Array<{
      name: string;
      amount: number;
      projects: number;
      remaining_limit: number;
    }>;
  };
}

// Calendar Types
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: "task" | "project" | "transport" | "personal";
  color?: string;
  data?: unknown;
}

export interface AvailableDate {
  date: string;
  available: boolean;
  reason?: string;
}

// Performance Types
export interface PerformanceMetrics {
  completion_rate: number;
  average_response_time: number;
  quality_score: number;
  collaboration_score: number;
  punctuality_score: number;
}

export interface GoalTracking {
  id: string;
  user_id: string;
  title: string;
  description: string;
  target_value: number;
  current_value: number;
  target_date: string;
  status: "active" | "completed" | "paused";
  created_at: string;
}

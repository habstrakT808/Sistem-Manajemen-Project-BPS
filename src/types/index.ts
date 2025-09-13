export type UserRole = 'admin' | 'ketua_tim' | 'pegawai'

export type ProjectStatus = 'upcoming' | 'active' | 'completed'

export type TaskStatus = 'pending' | 'in_progress' | 'completed'

export type AssigneeType = 'pegawai' | 'mitra'

export interface User {
  id: string
  email: string
  role: UserRole
  nama_lengkap: string
  no_telepon?: string
  alamat?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  nama_project: string
  deskripsi: string
  tanggal_mulai: string
  deadline: string
  ketua_tim_id: string
  status: ProjectStatus
  created_at: string
  updated_at: string
  ketua_tim?: User
  assignments?: ProjectAssignment[]
  tasks?: Task[]
}

export interface Mitra {
  id: string
  nama_mitra: string
  jenis: 'perusahaan' | 'individu'
  kontak?: string
  alamat?: string
  deskripsi?: string
  rating_average: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProjectAssignment {
  id: string
  project_id: string
  assignee_type: AssigneeType
  assignee_id: string
  uang_transport?: number
  honor?: number
  created_at: string
  project?: Project
  pegawai?: User
  mitra?: Mitra
}

export interface Task {
  id: string
  project_id: string
  pegawai_id: string
  tanggal_tugas: string
  deskripsi_tugas: string
  status: TaskStatus
  response_pegawai?: string
  created_at: string
  updated_at: string
  project?: Project
  pegawai?: User
}

export interface MitraReview {
  id: string
  project_id: string
  mitra_id: string
  pegawai_id: string
  rating: number
  komentar?: string
  created_at: string
  project?: Project
  mitra?: Mitra
  pegawai?: User
}

export interface FinancialRecord {
  id: string
  project_id: string
  recipient_type: AssigneeType
  recipient_id: string
  amount: number
  description: string
  bulan: number
  tahun: number
  created_at: string
  project?: Project
}

// Dashboard Types
export interface DashboardStats {
  totalUsers: number
  activeProjects: number
  completedProjects: number
  monthlySpending: number
}

export interface WorkloadIndicator {
  pegawai_id: string
  nama_lengkap: string
  project_count: number
  workload_level: 'low' | 'medium' | 'high'
}

// Form Types
export interface CreateProjectForm {
  nama_project: string
  deskripsi: string
  tanggal_mulai: string
  deadline: string
  pegawai_assignments: {
    pegawai_id: string
    uang_transport: number
  }[]
  mitra_assignments: {
    mitra_id: string
    honor: number
  }[]
}

export interface CreateTaskForm {
  project_id: string
  pegawai_id: string
  tanggal_tugas: string
  deskripsi_tugas: string
}

export interface CreateUserForm {
  email: string
  password: string
  role: UserRole
  nama_lengkap: string
  no_telepon?: string
  alamat?: string
}

// API Response Types
export interface ApiResponse<T> {
  data: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Notification Types
export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  is_read: boolean
  created_at: string
}
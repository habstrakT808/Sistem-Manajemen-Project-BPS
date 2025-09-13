export const APP_NAME = 'Sistem Manajemen Project & Pegawai'

export const USER_ROLES = {
  ADMIN: 'admin' as const,
  KETUA_TIM: 'ketua_tim' as const,
  PEGAWAI: 'pegawai' as const,
}

export const PROJECT_STATUS = {
  UPCOMING: 'upcoming' as const,
  ACTIVE: 'active' as const,
  COMPLETED: 'completed' as const,
}

export const TASK_STATUS = {
  PENDING: 'pending' as const,
  IN_PROGRESS: 'in_progress' as const,
  COMPLETED: 'completed' as const,
}

export const ASSIGNEE_TYPES = {
  PEGAWAI: 'pegawai' as const,
  MITRA: 'mitra' as const,
}

export const WORKLOAD_THRESHOLDS = {
  LOW: 2,
  MEDIUM: 4,
}

export const MITRA_MONTHLY_LIMIT = 3300000 // 3.3 juta

export const NOTIFICATION_TYPES = {
  INFO: 'info' as const,
  SUCCESS: 'success' as const,
  WARNING: 'warning' as const,
  ERROR: 'error' as const,
}

export const ROUTES = {
  // Auth
  LOGIN: '/auth/login',
  
  // Admin
  ADMIN_DASHBOARD: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_MITRA: '/admin/mitra',
  
  // Ketua Tim
  KETUA_TIM_DASHBOARD: '/ketua-tim',
  KETUA_TIM_PROJECTS: '/ketua-tim/projects',
  KETUA_TIM_TEAM: '/ketua-tim/team',
  KETUA_TIM_REPORTS: '/ketua-tim/reports',
  
  // Pegawai
  PEGAWAI_DASHBOARD: '/pegawai',
  PEGAWAI_TASKS: '/pegawai/tasks',
  PEGAWAI_PROJECTS: '/pegawai/projects',
  PEGAWAI_REVIEWS: '/pegawai/reviews',
}

export const DATE_FORMATS = {
  DISPLAY: 'dd MMMM yyyy',
  INPUT: 'yyyy-MM-dd',
  DATETIME: 'dd/MM/yyyy HH:mm',
}

export const CURRENCY_FORMAT = {
  LOCALE: 'id-ID',
  CURRENCY: 'IDR',
}
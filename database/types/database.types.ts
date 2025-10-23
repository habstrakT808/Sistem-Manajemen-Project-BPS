export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          role: "admin" | "ketua_tim" | "pegawai";
          nama_lengkap: string;
          no_telepon: string | null;
          alamat: string | null;
          nip: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          role: "admin" | "ketua_tim" | "pegawai";
          nama_lengkap: string;
          no_telepon?: string | null;
          alamat?: string | null;
          nip?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: "admin" | "ketua_tim" | "pegawai";
          nama_lengkap?: string;
          no_telepon?: string | null;
          alamat?: string | null;
          nip?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      mitra: {
        Row: {
          id: string;
          nama_mitra: string;
          jenis: "perusahaan" | "individu";
          kontak: string | null;
          alamat: string | null;
          deskripsi: string | null;
          rating_average: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nama_mitra: string;
          jenis: "perusahaan" | "individu";
          kontak?: string | null;
          alamat?: string | null;
          deskripsi?: string | null;
          rating_average?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nama_mitra?: string;
          jenis?: "perusahaan" | "individu";
          kontak?: string | null;
          alamat?: string | null;
          deskripsi?: string | null;
          rating_average?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          nama_project: string;
          deskripsi: string;
          tanggal_mulai: string;
          deadline: string;
          ketua_tim_id: string;
          status: "upcoming" | "active" | "completed";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nama_project: string;
          deskripsi: string;
          tanggal_mulai: string;
          deadline: string;
          ketua_tim_id: string;
          status?: "upcoming" | "active" | "completed";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nama_project?: string;
          deskripsi?: string;
          tanggal_mulai?: string;
          deadline?: string;
          ketua_tim_id?: string;
          status?: "upcoming" | "active" | "completed";
          created_at?: string;
          updated_at?: string;
        };
      };
      project_assignments: {
        Row: {
          id: string;
          project_id: string;
          assignee_type: "pegawai" | "mitra";
          assignee_id: string;
          uang_transport: number | null;
          honor: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          assignee_type: "pegawai" | "mitra";
          assignee_id: string;
          uang_transport?: number | null;
          honor?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          assignee_type?: "pegawai" | "mitra";
          assignee_id?: string;
          uang_transport?: number | null;
          honor?: number | null;
          created_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          pegawai_id: string | null;
          assignee_mitra_id: string | null;
          assignee_user_id: string | null;
          title: string | null;
          tanggal_tugas: string;
          deskripsi_tugas: string;
          start_date: string | null;
          end_date: string | null;
          has_transport: boolean;
          transport_days: number;
          honor_amount: number;
          status: "pending" | "in_progress" | "completed";
          response_pegawai: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          pegawai_id?: string | null;
          assignee_mitra_id?: string | null;
          assignee_user_id?: string | null;
          title?: string | null;
          tanggal_tugas: string;
          deskripsi_tugas: string;
          start_date?: string | null;
          end_date?: string | null;
          has_transport?: boolean;
          transport_days?: number;
          honor_amount?: number;
          status?: "pending" | "in_progress" | "completed";
          response_pegawai?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          pegawai_id?: string | null;
          assignee_mitra_id?: string | null;
          assignee_user_id?: string | null;
          title?: string | null;
          tanggal_tugas?: string;
          deskripsi_tugas?: string;
          start_date?: string | null;
          end_date?: string | null;
          has_transport?: boolean;
          transport_days?: number;
          honor_amount?: number;
          status?: "pending" | "in_progress" | "completed";
          response_pegawai?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      mitra_reviews: {
        Row: {
          id: string;
          project_id: string;
          mitra_id: string;
          pegawai_id: string;
          rating: number;
          komentar: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          mitra_id: string;
          pegawai_id: string;
          rating: number;
          komentar?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          mitra_id?: string;
          pegawai_id?: string;
          rating?: number;
          komentar?: string | null;
          created_at?: string;
        };
      };
      financial_records: {
        Row: {
          id: string;
          project_id: string;
          recipient_type: "pegawai" | "mitra";
          recipient_id: string;
          amount: number;
          description: string;
          bulan: number;
          tahun: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          recipient_type: "pegawai" | "mitra";
          recipient_id: string;
          amount: number;
          description: string;
          bulan: number;
          tahun: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          recipient_type?: "pegawai" | "mitra";
          recipient_id?: string;
          amount?: number;
          description?: string;
          bulan?: number;
          tahun?: number;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: "info" | "success" | "warning" | "error";
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type: "info" | "success" | "warning" | "error";
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: "info" | "success" | "warning" | "error";
          is_read?: boolean;
          created_at?: string;
        };
      };
      system_settings: {
        Row: {
          id: number;
          config: Json;
          updated_by: string | null;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          config: Json;
          updated_by?: string | null;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          config?: Json;
          updated_by?: string | null;
          updated_at?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_pegawai_workload: {
        Args: {
          pegawai_id: string;
          start_date: string;
          end_date: string;
        };
        Returns: {
          project_count: number;
          workload_level: string;
        }[];
      };
      get_mitra_monthly_total: {
        Args: {
          mitra_id: string;
          month: number;
          year: number;
        };
        Returns: {
          total_amount: number;
        }[];
      };
      update_project_status: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      update_mitra_rating: {
        Args: {
          mitra_id: string;
        };
        Returns: undefined;
      };
      get_dashboard_stats: {
        Args: {
          user_id: string;
        };
        Returns: Json;
      };
      get_user_registration_trends: {
        Args: {
          days_back: number;
        };
        Returns: {
          date: string;
          total_registrations: number;
          admin_count: number;
          ketua_tim_count: number;
          pegawai_count: number;
        }[];
      };
      get_project_analytics: {
        Args: {
          days_back: number;
        };
        Returns: {
          date: string;
          projects_created: number;
          projects_completed: number;
          active_projects: number;
          total_projects: number;
        }[];
      };
      get_financial_analytics: {
        Args: {
          months_back: number;
        };
        Returns: {
          month_year: string;
          total_spending: number;
          transport_spending: number;
          honor_spending: number;
          project_count: number;
        }[];
      };
      get_system_performance_metrics: {
        Args: Record<PropertyKey, never>;
        Returns: {
          database_size: string;
          total_tables: number;
          total_users: number;
          active_users: number;
          total_projects: number;
          active_projects: number;
          completed_projects: number;
          total_tasks: number;
          pending_tasks: number;
          completed_tasks: number;
          total_mitra: number;
          active_mitra: number;
          total_notifications: number;
          unread_notifications: number;
          this_month_spending: number;
          avg_project_duration: number;
          user_roles_distribution: Record<string, number>;
          project_status_distribution: Record<string, number>;
        }[];
      };
    };
    Enums: {
      user_role: "admin" | "ketua_tim" | "pegawai";
      project_status: "upcoming" | "active" | "completed";
      task_status: "pending" | "in_progress" | "completed";
      assignee_type: "pegawai" | "mitra";
      notification_type: "info" | "success" | "warning" | "error";
    };
  };
};
